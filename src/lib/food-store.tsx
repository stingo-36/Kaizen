import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { emptyFood, FoodData } from './food';
import { useStore } from './store';

/* Food diary, saved on the phone per account. */
const key = (u: string) => `kaizen.c.food.${u}`;

type Ctx = { food: FoodData; setFood: (fn: (f: FoodData) => FoodData) => void };
const FoodCtx = createContext<Ctx | null>(null);
export const useFood = () => {
  const c = useContext(FoodCtx);
  if (!c) throw new Error('useFood must be used inside FoodProvider');
  return c;
};

export function FoodProvider({ children }: { children: ReactNode }) {
  const { me } = useStore();
  const [food, setState] = useState<FoodData>(emptyFood());
  const cur = useRef(food);
  useEffect(() => {
    let alive = true;
    cur.current = emptyFood(); setState(cur.current);
    if (!me) return;
    AsyncStorage.getItem(key(me)).then((v) => {
      if (!alive || !v) return;
      try { cur.current = { ...emptyFood(), ...JSON.parse(v) }; setState(cur.current); } catch {}
    }).catch(() => {});
    return () => { alive = false; };
  }, [me]);
  const setFood = useCallback((fn: (f: FoodData) => FoodData) => {
    cur.current = fn(cur.current);
    setState(cur.current);
    if (me) AsyncStorage.setItem(key(me), JSON.stringify(cur.current)).catch(() => {});
  }, [me]);
  return <FoodCtx.Provider value={{ food, setFood }}>{children}</FoodCtx.Provider>;
}
