'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { unlockCameraReferences } from '@/app/camera-references/access-actions';
import styles from './CameraAccessForm.module.css';

function UnlockButton() {
  const { pending } = useFormStatus();
  return <button className={styles.unlock} type="submit" disabled={pending}>{pending ? 'Unlocking…' : 'Unlock camera references'}<span aria-hidden="true">→</span></button>;
}

export function CameraAccessForm({ project, shot }: { project: string; shot: string }) {
  const [state, action] = useFormState(unlockCameraReferences, { error: null });
  return <main className={styles.page}>
    <Link href="/" className={styles.brand}><span>S</span>Storyboard</Link>
    <div className={styles.card}>
      <svg className={styles.icon} width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></svg>
      <p className={styles.kicker}>YOUR PRIVATE REFERENCE LIBRARY</p>
      <h1>Camera references<span>.</span></h1>
      <p className={styles.description}>Enter the section password to explore your cinematic library.</p>
      <form action={action}>
        <input type="hidden" name="project" value={project} />
        <input type="hidden" name="shot" value={shot} />
        <label htmlFor="camera-password">Section password</label>
        <input id="camera-password" name="password" type="password" required autoComplete="current-password" autoFocus maxLength={256} aria-describedby={state.error ? 'camera-access-error' : undefined} />
        {state.error && <p className={styles.error} id="camera-access-error" role="alert">{state.error}</p>}
        <UnlockButton />
      </form>
      <Link className={styles.back} href={project ? `/p/${project}` : '/'}>← {project ? 'Back to storyboard' : 'Back to projects'}</Link>
    </div>
    <p className={styles.footer}>CINEMATIQUE <span>×</span> STORYBOARD</p>
  </main>;
}
