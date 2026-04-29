"use client";

import type { ReactNode } from "react";
import { fontDisplay } from "@/lib/app-fonts";

type ModuleFrameProps = {
  title: string;
  /** Строка или элемент сразу под заголовком (тонкая подсказка; для кнопок передайте ReactNode). */
  titleSubline?: ReactNode;
  /** Элемент справа от заголовка (например пилюля статуса). */
  titleAccessory?: ReactNode;
  /** Сразу справа от заголовка h1 (тонкая ссылка «Архив» и т.п.), не уезжает в край строки. */
  titleBesideEnd?: ReactNode;
  /** Кнопки в той же строке, что заголовок (обычно справа, напр. «Сохранить»). */
  titleRowEnd?: ReactNode;
  description?: string;
  /** Доп. классы для абзаца описания (например `no-print` для отгрузок). */
  descriptionClassName?: string;
  /** Доп. классы корневого контейнера (например `mx-auto max-w-7xl` для узкой полосы). */
  rootClassName?: string;
  /** Размер/стиль заголовка (если не задан — `text-xl` / `lg:text-2xl`). */
  titleClassName?: string;
  children?: ReactNode;
};

/**
 * Область модуля: заголовок слева сверху с лёгким «раскрытием» после перехода (CSS).
 */
export function ModuleFrame({
  title,
  titleSubline,
  titleAccessory,
  titleBesideEnd,
  titleRowEnd,
  description,
  descriptionClassName,
  rootClassName,
  titleClassName,
  children,
}: ModuleFrameProps) {
  return (
    <div
      className={[
        "flex min-h-full min-w-0 max-w-full flex-col overflow-x-clip px-3 pb-8 pt-6 sm:px-6 sm:pt-8 md:px-8 md:pb-10 lg:px-10 lg:pt-10 landscape:max-lg:px-4 landscape:max-lg:pb-4 landscape:max-lg:pt-4 landscape:max-lg:sm:px-5",
        rootClassName ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/*
        Шапка выше контента по z-index: выпадающие пилюли absolute иначе перекрываются карточками формы.
      */}
      <header className="module-frame-header relative z-50 mb-6 max-w-full min-w-0 origin-top-left sm:mb-8 landscape:max-lg:mb-3 landscape:max-lg:sm:mb-4">
        {/*
          На lg подстрочник (напр. «Изменить номер») уходит на вторую строку (order + basis-full),
          чтобы в первой строке только h1 + пилюли + кнопки — тогда items-center совпадает с визуальным центром заголовка.
        */}
        <div className="flex max-w-full min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3 lg:gap-y-2">
          {/*
            Отступ только у заголовка — см. .module-frame-title-h1-wrap в globals.css
            (fixed-меню 2.75rem + safe-area; не тянем весь main).
          */}
          <div className="module-frame-title-h1-wrap order-1 flex min-w-0 max-w-full shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 lg:max-w-[min(100%,42rem)]">
            <h1
              className={
                titleClassName?.trim()
                  ? `${fontDisplay.className} break-words font-semibold tracking-tight text-[var(--app-text)] ${titleClassName.trim()}`
                  : `${fontDisplay.className} break-words text-xl font-semibold tracking-tight text-[var(--app-text)] lg:text-2xl`
              }
            >
              {title}
            </h1>
            {titleBesideEnd ? (
              <div className="shrink-0 font-sans">{titleBesideEnd}</div>
            ) : null}
          </div>
          {titleSubline != null && titleSubline !== false ? (
            typeof titleSubline === "string" ||
            typeof titleSubline === "number" ? (
              <p className="order-2 mt-0.5 font-sans text-[0.65rem] font-normal leading-tight text-[var(--text-muted)] lg:order-4 lg:mt-1.5 lg:basis-full lg:w-full">
                {titleSubline}
              </p>
            ) : (
              <div className="order-2 mt-0.5 min-w-0 font-sans text-[0.65rem] font-normal leading-tight text-[var(--text-muted)] lg:order-4 lg:mt-1.5 lg:basis-full lg:w-full">
                {titleSubline}
              </div>
            )
          ) : null}
          {titleAccessory ? (
            <div className="relative z-50 order-3 min-w-0 w-full max-w-full lg:order-2 lg:w-auto lg:max-w-[min(100%,56rem)]">
              <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-start">
                {titleAccessory}
              </div>
            </div>
          ) : null}
          {titleRowEnd ? (
            <div className="order-4 flex w-full min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 lg:order-3 lg:ml-auto lg:w-auto">
              {titleRowEnd}
            </div>
          ) : null}
        </div>
        {description ? (
          <p
            className={[
              "mt-2 text-[var(--text-secondary)]",
              descriptionClassName && /\bmax-w-/.test(descriptionClassName)
                ? ""
                : "max-w-2xl",
              descriptionClassName &&
              /\btext-(xs|sm|base|lg|xl)\b/.test(descriptionClassName)
                ? ""
                : "text-sm",
              descriptionClassName ?? "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {description}
          </p>
        ) : null}
      </header>
      <div className="relative z-0 min-w-0">{children}</div>
    </div>
  );
}
