"use client";

import type { ReactNode } from "react";

type ModuleFrameProps = {
  title: string;
  /** Элемент справа от заголовка (например пилюля статуса). */
  titleAccessory?: ReactNode;
  /** Кнопки в той же строке, что заголовок (обычно справа, напр. «Сохранить»). */
  titleRowEnd?: ReactNode;
  description?: string;
  /** Доп. классы для абзаца описания (например `no-print` для отгрузок). */
  descriptionClassName?: string;
  children?: ReactNode;
};

/**
 * Область модуля: заголовок слева сверху с лёгким «раскрытием» после перехода (CSS).
 */
export function ModuleFrame({
  title,
  titleAccessory,
  titleRowEnd,
  description,
  descriptionClassName,
  children,
}: ModuleFrameProps) {
  return (
    <div className="flex min-h-full min-w-0 flex-col px-8 pb-10 pt-8 lg:px-10 lg:pt-10">
      {/*
        Шапка выше контента по z-index: выпадающие пилюли absolute иначе перекрываются карточками формы.
      */}
      <header className="module-frame-header relative z-50 mb-8 origin-top-left">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 lg:gap-x-3">
          <div className="relative z-50 flex min-w-0 flex-wrap items-center gap-2 lg:gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--app-text)] lg:text-2xl">
              {title}
            </h1>
            {titleAccessory ? (
              <div className="relative z-50 inline-flex min-w-0 max-w-full shrink flex-wrap items-center gap-y-1">
                {titleAccessory}
              </div>
            ) : null}
          </div>
          {titleRowEnd ? (
            <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
              {titleRowEnd}
            </div>
          ) : null}
        </div>
        {description ? (
          <p
            className={`mt-2 max-w-2xl text-sm text-[var(--text-secondary)] ${descriptionClassName ?? ""}`}
          >
            {description}
          </p>
        ) : null}
      </header>
      <div className="relative z-0 min-w-0">{children}</div>
    </div>
  );
}
