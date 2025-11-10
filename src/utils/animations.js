import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const initScrollAnimations = () => {
  const fadeInUpElements = gsap.utils.toArray('.fade-in-up')
  fadeInUpElements.forEach((element) => {
    if (element) {
      gsap.from(element, {
        opacity: 0,
        y: 50,
        duration: 0.8,
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      })
    }
  })

  const fadeInElements = gsap.utils.toArray('.fade-in')
  fadeInElements.forEach((element) => {
    if (element) {
      gsap.from(element, {
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: element,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      })
    }
  })
}

export const animateThemeTransition = (callback) => {
  const body = document.querySelector('body')
  if (!body) {
    callback()
    return
  }
  gsap.to(body, {
    duration: 0.3,
    opacity: 0,
    onComplete: () => {
      callback()
      gsap.to(body, {
        duration: 0.3,
        opacity: 1,
      })
    },
  })
}

export const animatePageTransition = (callback) => {
  const pageTransition = document.querySelector('.page-transition')
  if (!pageTransition) {
    callback()
    return
  }
  const tl = gsap.timeline()
  tl.to(pageTransition, {
    duration: 0.3,
    opacity: 1,
    scale: 1.05,
    onComplete: callback,
  }).to(pageTransition, {
    duration: 0.3,
    opacity: 0,
    scale: 1,
  })
}

