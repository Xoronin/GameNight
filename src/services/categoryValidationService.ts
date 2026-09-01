import { supabase } from "../lib/supabase";
import type {
  CategoryValidationRequest,
  CategoryValidationResult,
} from "../types/categories";

export async function validateCategoryAnswer(
  request: CategoryValidationRequest,
): Promise<CategoryValidationResult> {
  const { data, error } = await supabase.functions.invoke(
    "validate-category-answer",
    {
      body: request,
    },
  );

  if (error) {
    throw new Error(
      `Could not validate answer: ${error.message}`,
    );
  }

  return data as CategoryValidationResult;
}