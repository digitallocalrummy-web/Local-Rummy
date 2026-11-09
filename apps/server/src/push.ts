/** Sends notifications through Expo's push service (works with the Expo app's push tokens). */
export async function sendPush(tokens: string[], title: string, body: string): Promise<number> {
  const valid = tokens.filter((t) => /^Expo(nent)?PushToken\[.+\]$/.test(t));
  let delivered = 0;
  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100).map((to) => ({ to, title, body, sound: 'default' }));
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(batch),
      });
      const json = (await res.json()) as { data?: { status: string }[] };
      delivered += (json.data ?? []).filter((d) => d.status === 'ok').length;
    } catch (e) {
      console.error('push batch failed', (e as Error).message);
    }
  }
  return delivered;
}
