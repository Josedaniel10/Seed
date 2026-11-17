import { useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIdentityColor } from '../../lib/visualIdentity.ts';
import type { VisualIdentity } from '../../lib/visualIdentity.ts';
import { IdentityIcon } from '../../components/ui/IdentityIcon.tsx';
import { callsClient } from './callsApi.ts';
import { useSessionStore } from '../../stores/session.store.ts';

export function CallCover({ imageUrl, icon_key = 'megaphone', accent_color = 'forest' }: VisualIdentity & { imageUrl?: string | null }): ReactElement {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const color = getIdentityColor(accent_color);
  if (imageUrl && imageUrl !== failedUrl) return <img src={imageUrl} alt="" className="call-cover" width={960} height={320} loading="lazy" decoding="async" onError={() => setFailedUrl(imageUrl)} />;
  return <div className="call-cover call-cover-fallback" aria-hidden="true" style={{ backgroundColor: color.background, color: color.foreground }}>
    <span className="call-cover-orbit" /><span className="call-cover-orbit call-cover-orbit-second" />
    <IdentityIcon icon_key={icon_key} accent_color={accent_color} size={40} />
  </div>;
}

export function StoredCallCover({ path, ...identity }: VisualIdentity & { path?: string | null }): ReactElement {
  const userId = useSessionStore((state) => state.user?.id);
  const image = useQuery({ queryKey: ['call-cover', userId, path], enabled: Boolean(path && userId), staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await callsClient().storage.from('call-covers').createSignedUrl(path, 3600);
      if (error) throw new Error('No se pudo cargar la portada.');
      return data.signedUrl;
    }, retry: 1,
  });
  return <CallCover imageUrl={image.data} {...identity} />;
}
