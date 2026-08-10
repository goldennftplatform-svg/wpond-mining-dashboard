const fs = require('fs');
const paths = [
  '/mnt/c/Users/PreSafu/AppData/Roaming/com.vercel.cli/Data/auth.json',
  'C:/Users/PreSafu/AppData/Roaming/com.vercel.cli/Data/auth.json',
];
const projPaths = [
  '/mnt/c/Users/PreSafu/Desktop/MDB/.vercel/project.json',
  'C:/Users/PreSafu/Desktop/MDB/.vercel/project.json',
];
for (const p of paths) {
  if (fs.existsSync(p)) {
    const a = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log('auth_path', p);
    console.log('keys', Object.keys(a));
    const token = a.token || a.authToken || '';
    console.log('token_len', token.length);
    if (token) fs.writeFileSync('/tmp/vercel-token', token);
    break;
  }
}
for (const p of projPaths) {
  if (fs.existsSync(p)) {
    console.log('project', fs.readFileSync(p, 'utf8'));
    break;
  }
}
