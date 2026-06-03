import '../styles/globals.css'
export const metadata = { title: 'AFN · Creator Platform', description: 'A Farmácia Natural' }
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
