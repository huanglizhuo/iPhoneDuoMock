import { projectSchema } from './project';
import { t } from '../i18n';
import type { Project } from './project';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('duo-studio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(t('errors.idbBlocked')));
  });
}
export async function restoreProject(): Promise<Project | null> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction('projects').objectStore('projects').get('current');
      r.onsuccess = () => {
        try {
          resolve(r.result ? projectSchema.parse(r.result) : null);
        } catch {
          reject(new Error(t('errors.idbInvalid')));
        }
      };
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function saveProject(project: Project): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').put(project, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
