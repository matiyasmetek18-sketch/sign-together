import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function ensureDevCertificate(directory, hosts) {
  fs.mkdirSync(directory, {recursive: true});
  const names = [...new Set(['localhost', ...hosts])].sort();
  const stamp = names.join('\n');
  const stampPath = path.join(directory, 'hosts.txt');
  const keyPath = path.join(directory, 'key.pem');
  const certPath = path.join(directory, 'cert.pem');
  if (
    fs.existsSync(keyPath) &&
    fs.existsSync(certPath) &&
    fs.existsSync(stampPath) &&
    fs.readFileSync(stampPath, 'utf8') === stamp
  ) {
    return {key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath)};
  }

  const altNames = names
    .map((name) => (/^\d+\.\d+\.\d+\.\d+$/.test(name) ? `IP:${name}` : `DNS:${name}`))
    .join(',');
  const configPath = path.join(directory, 'openssl.cnf');
  fs.writeFileSync(
    configPath,
    `[req]
distinguished_name = dn
x509_extensions = v3
prompt = no
[dn]
CN = Sign Together
[v3]
subjectAltName = ${altNames}
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
`,
  );
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-sha256',
      '-days',
      '30',
      '-nodes',
      '-keyout',
      keyPath,
      '-out',
      certPath,
      '-config',
      configPath,
    ],
    {stdio: 'pipe'},
  );
  fs.writeFileSync(stampPath, stamp);
  return {key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath)};
}
