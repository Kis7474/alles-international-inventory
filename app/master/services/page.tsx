import { redirect } from 'next/navigation'

export default function LegacyMasterServicesRedirectPage() {
  redirect('/services')
}
