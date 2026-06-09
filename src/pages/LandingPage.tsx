import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { Features } from '../components/Features'
import { HowItWorks } from '../components/HowItWorks'
import { Pricing } from '../components/Pricing'
import { Testimonials } from '../components/Testimonials'
import { FAQ } from '../components/FAQ'
import { CTA } from '../components/CTA'
import { Footer } from '../components/Footer'

export function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
