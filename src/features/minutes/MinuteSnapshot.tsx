import type { MinuteContent } from './minuteContent.ts';

export function MinuteSnapshot({ content }: { content: MinuteContent }) {
  const snapshot = content.snapshot;
  return <>
    <dl className="grid gap-4 sm:grid-cols-2 rounded-xl bg-[#F3F6F2] p-4">
      {Object.entries({ 'Sesión': snapshot.session, 'Fecha': snapshot.date, 'Hora de inicio': snapshot.time, 'Lugar o enlace': snapshot.location }).map(([label, value]) =>
        <div key={label} className="min-w-0"><dt className="text-xs text-stone-500">{label}</dt><dd className="font-medium break-words">{value || 'Sin especificar'}</dd></div>)}
    </dl>
    <section className="space-y-3" aria-label="Asistencia y quórum">
      <h3 className="font-bold text-base text-[#14281D]">Asistencia y quórum</h3>
      <p className="text-stone-600">{snapshot.attendees.filter((person) => /^(Presente|Asistió)$/i.test(person.status)).length} asistentes de {snapshot.attendees.length} personas registradas.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-stone-50"><tr><th className="p-2">Nombre</th><th className="p-2">Participación</th><th className="p-2">Asistencia</th></tr></thead>
        <tbody>{snapshot.attendees.map((person, index) => <tr key={`${person.name}-${index}`} className="border-b border-stone-100">
          <td className="p-2">{person.name}{person.notes && <p className="text-xs text-stone-500 whitespace-pre-wrap">{person.notes}</p>}</td><td className="p-2">{person.role || 'Sin especificar'}</td><td className="p-2">{person.status}</td>
        </tr>)}</tbody>
      </table></div>
      {!snapshot.attendees.length && <p>El borrador original no detalla asistentes.</p>}
      {snapshot.attendanceNotes.map((note, index) => <p key={index} className="text-stone-600 whitespace-pre-wrap">{note}</p>)}
    </section>
    <section className="space-y-3" aria-label="Orden del día">
      <h3 className="font-bold text-base text-[#14281D]">Orden del día</h3>
      {!snapshot.agenda.length && <p>El borrador original no incluye una agenda separada.</p>}
      {snapshot.agenda.map((topic, index) => <article key={index} className="rounded-xl border border-stone-200 p-4 space-y-1">
        <h4 className="font-semibold">{topic.order && `${topic.order}. `}{topic.title}</h4>
        {topic.speaker && <p className="text-stone-600">Ponente: {topic.speaker}</p>}
        {topic.result && <p className="font-medium text-[#365F46]">{topic.result}</p>}
      </article>)}
    </section>
  </>;
}
