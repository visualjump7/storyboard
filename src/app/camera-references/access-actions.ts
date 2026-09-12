'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cameraReferenceReturnPath, clearCameraReferenceAccess, unlockCameraReferenceAccess } from '@/lib/camera-reference/access';

export async function unlockCameraReferences(
  _previous: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const password = formData.get('password');
  if (typeof password !== 'string') return { error: 'Enter the camera references password.' };

  const result = await unlockCameraReferenceAccess(user.id, password);
  if (result === 'incorrect-password') return { error: 'Incorrect camera references password.' };
  if (result === 'unavailable') return { error: 'Camera references access is unavailable. Check the server configuration.' };

  redirect(cameraReferenceReturnPath(formData.get('project'), formData.get('shot')));
}

export async function lockCameraReferences(): Promise<void> {
  clearCameraReferenceAccess();
  redirect('/camera-references/unlock');
}
