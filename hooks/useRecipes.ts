import { useState, useEffect } from 'react';
import { FermentationStep } from '../types';

export interface Recipe {
  id: string;
  name: string;
  steps: FermentationStep[];
  source: 'brewfather' | 'manual';
  createdAt: string;
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('fermenter_recipes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('fermenter_recipes', JSON.stringify(recipes));
  }, [recipes]);

  const addRecipe = (recipe: Omit<Recipe, 'id' | 'createdAt'>) => {
    const newRecipe: Recipe = {
      ...recipe,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setRecipes(prev => [...prev, newRecipe]);
    return newRecipe;
  };

  const deleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  return { recipes, addRecipe, deleteRecipe };
}
