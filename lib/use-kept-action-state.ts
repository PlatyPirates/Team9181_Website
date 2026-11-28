"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Drop-in for useActionState for <form>s that should KEEP what the person typed.
 *
 * Passing an action straight to <form action={...}> makes React 19 clear every field
 * once the action finishes, even when it returns an error, so a long form comes back
 * empty. Use `<form onSubmit={submit}>` with this hook instead: the browser's own
 * required/email checks still run first, then the action is called without the reset.
 * Forms that should clear after a success call `form.reset()` themselves.
 */
export function useKeptActionState<S, _P = FormData>(fn: (prev: Awaited<S>, fd: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState(fn, initial);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  };
  return [state, submit, pending] as const;
}
