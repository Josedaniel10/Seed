// Install verified base files without replacing administrator-provided templates.
import 'dotenv/config';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const target = new URL(process.env.DATABASE_URL);
const project = new URL(process.env.VITE_SUPABASE_URL).hostname.split('.')[0];
if (target.hostname !== `db.${project}.supabase.co` && decodeURIComponent(target.username) !== `postgres.${project}`) throw new Error('Proyecto de base de datos incorrecto.');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const id = randomUUID(), password = randomBytes(32).toString('hex'), email = `seed-catalog-${id}@example.invalid`;
let created = false;
try {
  await db.connect();
  const admin = (await db.query("SELECT id FROM public.profiles WHERE is_active AND (role='admin' OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=profiles.id AND role='admin' AND is_active)) LIMIT 1")).rows[0];
  if (!admin) throw new Error('Se requiere un administrador activo para conservar la propiedad institucional de las plantillas.');
  await db.query(`INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    VALUES('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,extensions.crypt($3,extensions.gen_salt('bf')),now(),'','','','','{"provider":"email","providers":["email"],"seed_initial_role":"admin"}','{"full_name":"Instalador temporal de plantillas"}',now(),now())`, [id,email,password]);
  created=true;
  await db.query(`INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) VALUES($1::text,($1::text)::uuid,jsonb_build_object('sub',$1::text,'email',$2::text),'email',now(),now())`,[id,email]);
  const login=await client.auth.signInWithPassword({email,password}); if(login.error) throw login.error;
  const manifest=JSON.parse(await fs.readFile('scripts/catalog-templates/manifest.json','utf8'));
  for (const entry of manifest) {
    const candidates=await db.query(`SELECT r.id,r.template_url FROM public.requirements r JOIN public.application_types t ON t.id=r.application_type_id WHERE t.code=$1 AND r.name ILIKE $2 AND r.is_active`,[entry.code,`%${entry.contains}%`]);
    if(candidates.rowCount!==1) throw new Error(`No se identificó exactamente un requisito para ${entry.code}: ${entry.contains}`);
    const requirement=candidates.rows[0];
    if(requirement.template_url && !requirement.template_url.startsWith('/templates/')) { console.log(`Preserved existing template: ${entry.code} ${entry.file}`); continue; }
    const bytes=await fs.readFile(`public/templates/catalog/${entry.file}`);
    const contentType=entry.file.endsWith('.xlsx')?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const key=`${id}/seed-base-v1/${entry.file}`;
    const upload=await client.storage.from('catalog-templates').upload(key,bytes,{contentType,upsert:false}); if(upload.error) throw upload.error;
    const download=await client.storage.from('catalog-templates').download(key); if(download.error) throw download.error;
    if(createHash('sha256').update(Buffer.from(await download.data.arrayBuffer())).digest('hex')!==createHash('sha256').update(bytes).digest('hex')) throw new Error('La plantilla descargada no coincide con el archivo original.');
    // Maintenance installation: no fake human approval or user action is recorded.
    await db.query('BEGIN');
    try {
      await db.query('SELECT pg_advisory_xact_lock(16112026)');
      const updated=await db.query(`UPDATE public.requirements SET template_url=$1,template_revision=template_revision+1,template_updated_at=now() WHERE id=$2 AND template_url IS NOT DISTINCT FROM $3`,[key,requirement.id,requirement.template_url]);
      if(updated.rowCount!==1) throw new Error('El requisito cambió durante la instalación.');
      await db.query('UPDATE storage.objects SET owner=($1::text)::uuid,owner_id=$1::text WHERE bucket_id=\'catalog-templates\' AND name=$2',[admin.id,key]);
      await db.query('COMMIT');
    } catch(error) {await db.query('ROLLBACK');throw error;}
    console.log(`Installed and verified: ${entry.code} ${entry.file}`);
  }
  // These two exact seed entries referenced files that were never supplied.
  // Do not touch custom links or any other requirement.
  for (const [requirementId, legacyPath] of [
    ['b0000000-0000-0000-0000-000000000003','/templates/formato_aval_lider_grupo.pdf'],
    ['b0000000-0000-0000-0000-000000000004','/templates/formato_aval_tutor_docente.pdf'],
  ]) {
    const fileExists=await fs.access(`public${legacyPath}`).then(()=>true,()=>false);
    if(fileExists) continue;
    await db.query('BEGIN');
    try {
      await db.query('SELECT pg_advisory_xact_lock(16112026)');
      const cleaned=await db.query('UPDATE public.requirements SET template_url=NULL WHERE id=$1 AND template_url=$2',[requirementId,legacyPath]);
      await db.query('COMMIT');
      if(cleaned.rowCount) console.log(`Removed verified missing seed link: ${legacyPath}`);
    } catch(error) {await db.query('ROLLBACK');throw error;}
  }
} catch(error) { console.error('Template installation failed:',error.message);process.exitCode=1; }
finally {
  await client.auth.signOut();
  if(created) {
    // A failed unlinked upload must not prevent cleanup of the temporary identity.
    await db.query('DELETE FROM auth.users WHERE id=$1',[id]).catch(error=>{console.error('Temporary identity cleanup failed:',error.message);process.exitCode=1;});
  }
  await db.end();
}
