import AuthWrapper from '@/components/AuthWrapper'
import Chat from '@/components/Chat'

export default function Home() {
  return (
    <AuthWrapper>
      {(user) => <Chat user={user} />}
    </AuthWrapper>
  )
}
