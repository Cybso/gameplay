# -*- mode: python -*-

block_cipher = None


a = Analysis(['main.py'],
             pathex=['/home/roland/development/privat/gameplay'],
             binaries=[],
             datas=[],
             hiddenimports=[],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
a.datas += Tree('ui', prefix='ui')
exe = EXE(pyz,
          a.scripts,
          exclude_binaries=True,
          name='gameplay',
          debug=False,
          strip=False,
          upx=True,
          console=True
          )
coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas,
               strip=False,
               upx=True,
               name='gameplay')
