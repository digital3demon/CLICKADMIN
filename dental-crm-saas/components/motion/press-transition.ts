/** Плавное, но короткое нажатие для кнопок и ссылок */
export const pressTransition = {
  type: "tween" as const,
  duration: 0.16,
  ease: [0.2, 0.85, 0.25, 1] as const,
};

export const pressTap = { scale: 0.97 };
export const pressHover = { scale: 1.012 };
