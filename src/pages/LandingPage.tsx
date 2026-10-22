import { FaqSection } from '@/components/landing/FaqSection'
import { FeatureShowcase } from '@/components/landing/FeatureShowcase'
import { FinalCta } from '@/components/landing/FinalCta'
import { InsightsSection } from '@/components/landing/InsightsSection'
import { LandingHero } from '@/components/landing/LandingHero'
import { WhySection } from '@/components/landing/WhySection'

export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <FeatureShowcase />
      <InsightsSection />
      <WhySection />
      <FaqSection />
      <FinalCta />
    </>
  )
}
