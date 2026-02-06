import * as client from 'openid-client';
console.log('Exports:', Object.keys(client));
try {
    console.log('Issuer type:', typeof client.Issuer);
} catch (e) {
    console.log('Issuer not found');
}
