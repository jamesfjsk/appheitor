import { getApp } from 'firebase/app';
import { getAuth, fetchSignInMethodsForEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

type DoctorReport = {
  projectId?: string;
  authDomain?: string;
  apiKeyPrefix?: string;
  identityToolkitReachable: boolean;
  identityToolkitStatus?: number | string;
  signInMethods?: string[];
  firestoreReadOK?: boolean;
  firestoreWriteOK?: boolean;
  messages: string[];
};

export async function runFirebaseDoctor(emailToCheck?: string, testLogin?: {email: string; password: string}): Promise<DoctorReport> {
  const messages: string[] = [];
  try {
    const app = getApp();
    const projectId = app.options.projectId as string | undefined;
    const authDomain = app.options.authDomain as string | undefined;
    const apiKey = (app.options as any).apiKey as string | undefined;

    messages.push(`App carregado: projectId=${projectId}, authDomain=${authDomain}, apiKeyPrefix=${apiKey?.slice(0,10)}...`);

    // 1) Verifica Identity Toolkit REST (getProjectConfig) para detectar API KEY restrita/errada
    let identityToolkitReachable = false;
    let identityToolkitStatus: number | string = 'n/a';
    if (apiKey) {
      try {
        const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${apiKey}`;
        const res = await fetch(url, { method: 'GET' });
        identityToolkitStatus = res.status;
        identityToolkitReachable = res.ok;
        if (!res.ok) {
          const body = await res.text();
          messages.push(`getProjectConfig falhou: status=${res.status}, body=${body.slice(0,200)}...`);
        } else {
          messages.push('getProjectConfig OK (Identity Toolkit acessível).');
        }
      } catch (e: any) {
        identityToolkitStatus = e?.message ?? 'fetch error';
        messages.push(`Erro ao chamar getProjectConfig: ${identityToolkitStatus}`);
      }
    } else {
      messages.push('apiKey ausente no app.options (verifique firebaseConfig).');
    }

    // 2) Auth – fetch sign-in methods (não altera estado)
    const auth = getAuth(app);
    let signInMethods: string[] | undefined = undefined;
    if (emailToCheck) {
      try {
        signInMethods = await fetchSignInMethodsForEmail(auth, emailToCheck);
        messages.push(`SignInMethods(${emailToCheck}) = ${JSON.stringify(signInMethods)}`);
      } catch (e: any) {
        messages.push(`fetchSignInMethodsForEmail ERRO: ${e?.code ?? e?.message ?? e}`);
      }
    }

    // 3) Firestore – leitura e escrita simples
    const db = getFirestore(app);
    const pingRef = doc(db, '__healthcheck__/ping');
    let firestoreWriteOK = false;
    try {
      // write
      await setDoc(pingRef, { ts: new Date().toISOString(), ok: true });
      messages.push('Firestore WRITE OK.');
      firestoreWriteOK = true;
    } catch (e: any) {
      messages.push(`Firestore WRITE ERRO: ${e?.code ?? e?.message ?? e}`);
    }

    let firestoreReadOK = false;
    try {
      const snap = await getDoc(pingRef);
      firestoreReadOK = snap.exists();
      messages.push(`Firestore READ ${firestoreReadOK ? 'OK' : 'NÃO ENCONTROU DOC'}.`);
    } catch (e: any) {
      messages.push(`Firestore READ ERRO: ${e?.code ?? e?.message ?? e}`);
    }

    try { await deleteDoc(pingRef); } catch { /* opcional */ }

    // 4) (Opcional) Teste de login real
    if (testLogin) {
      try {
        const cred = await signInWithEmailAndPassword(auth, testLogin.email, testLogin.password);
        messages.push(`Login OK: uid=${cred.user.uid}`);
      } catch (e: any) {
        messages.push(`Login ERRO: ${e?.code ?? e?.message ?? e}`);
      }
    }

    return {
      projectId,
      authDomain,
      apiKeyPrefix: apiKey?.slice(0,10),
      identityToolkitReachable,
      identityToolkitStatus,
      signInMethods,
      firestoreReadOK,
      firestoreWriteOK,
      messages,
    };

  } catch (e: any) {
    return {
      identityToolkitReachable: false,
      identityToolkitStatus: 'doctor failed',
      messages: [`Doctor exception: ${e?.message ?? e}`],
    };
  }
}