export async function sendNotifications(tokens, payload) {
  await Promise.all(
    tokens.map(token =>
      fetch('/send-push', {
        method: 'POST',
        body: JSON.stringify({ token, payload })
      })
    )
  );
}