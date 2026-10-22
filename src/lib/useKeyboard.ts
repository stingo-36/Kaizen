import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/* Height of the on-screen keyboard (0 when hidden). Android apps are edge-to-edge, so the window no
   longer shrinks for the keyboard and KeyboardAvoidingView alone leaves inputs underneath it.
   Screens pad their content by this height instead, which works the same on both platforms. */
export function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(show, (e) => setH(e.endCoordinates.height));
    const b = Keyboard.addListener(hide, () => setH(0));
    return () => { a.remove(); b.remove(); };
  }, []);
  return h;
}
