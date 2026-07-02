with open('src/pages/AntiguedadSaldos/AntiguedadSaldos.tsx', 'rb') as f:
    raw = f.read()

# Find the text around limpiarCategoria
idx = raw.find(b'limpiarCategoria')
print('Found at byte offset', idx)
print('Bytes around:', repr(raw[idx:idx+350]))
