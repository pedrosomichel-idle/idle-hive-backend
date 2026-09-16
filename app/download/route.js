// app/download/route.js
//
// Link de download "próprio" (ex: idlehive.com/download): redireciona
// direto pro arquivo .exe mais recente no GitHub Releases, sem passar
// pela página de release. Como o electron-builder gera o instalador
// sempre com o mesmo nome (IdleHive-Setup.exe, configurado no
// package.json do app), esse link nunca precisa mudar entre versões.

import { NextResponse } from 'next/server';

const GITHUB_OWNER = 'pedrosomichel-idle';
const GITHUB_REPO = 'idle-hive';
const ASSET_NAME = 'IdleHive-Setup.exe';

export async function GET() {
  const url = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/${ASSET_NAME}`;
  return NextResponse.redirect(url);
}
