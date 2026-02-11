import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/')
  }

  const user = await currentUser()
  const subscriptionStatus = user?.privateMetadata?.subscriptionStatus as string | undefined

  // If no active subscription, redirect to checkout
  if (subscriptionStatus !== 'active') {
    redirect('/api/create-checkout')
  }

  return <>{children}</>
}
