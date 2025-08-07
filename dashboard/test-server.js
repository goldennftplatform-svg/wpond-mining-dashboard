const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Test server working!' });
});

console.log('🚀 Starting test server...');

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
}).on('error', (error) => {
  console.error('❌ Test server error:', error);
});
