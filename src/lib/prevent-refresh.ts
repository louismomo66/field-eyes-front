/**
 * Utility to prevent page refreshes when clicking on maps and other interactive elements
 */
export function preventDefaultNavigation(e: Event | MouseEvent | TouchEvent | any) {
  // Handle the event object
  if (e) {
    // Stop propagation
    e.stopPropagation?.();
    
    // Prevent default behavior
    e.preventDefault?.();
    
    // For Leaflet events that have originalEvent
    if (e.originalEvent) {
      e.originalEvent.stopPropagation?.();
      e.originalEvent.preventDefault?.();
    }
  }
  
  // Return false to prevent further handling
  return false;
}

/**
 * Apply navigation prevention to a DOM element
 */
export function applyNoRefreshToElement(element: HTMLElement | Document) {
  // Apply to click events
  element.addEventListener('click', preventDefaultNavigation);
  
  // Apply to touchstart events for mobile 
  element.addEventListener('touchstart', preventDefaultNavigation, { passive: false });
  
  // Return a cleanup function
  return () => {
    element.removeEventListener('click', preventDefaultNavigation);
    element.removeEventListener('touchstart', preventDefaultNavigation);
  };
} 