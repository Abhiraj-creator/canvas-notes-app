import { gsap } from 'gsap'

// Simple page transition utility for React Router
export const animatePageEnter = (element) => {
  if (!element) return
  gsap.from(element, {
    opacity: 0,
    y: 20,
    duration: 0.5,
    ease: 'power2.out',
  })
}

export const animatePageExit = (callback) => {
  const body = document.querySelector('body')
  if (!body) {
    callback()
    return
  }
  gsap.to(body, {
    opacity: 0.7,
    duration: 0.2,
    onComplete: callback,
  })
}

// Initialize page transitions on route changes
export const initPageTransitions = () => {
  // This will be called on route changes via useEffect in App.jsx
  return {
    enter: animatePageEnter,
    exit: animatePageExit,
  }
}
