import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatViews = (views: number) => {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views.toString();
};

export const validateImage = async (file: File): Promise<{ valid: boolean; error?: string }> => {
  if (file.size > 20 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 20MB limit.' };
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  });

  if (dimensions.width > 2000) {
    return { valid: false, error: `Image width (${dimensions.width}px) exceeds 2000px limit.` };
  }

  return { valid: true };
};
