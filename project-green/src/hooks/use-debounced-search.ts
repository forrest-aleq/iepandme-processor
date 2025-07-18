"use client"

import { useState, useEffect } from "react"

export function useDebouncedSearch(initialValue = "", delay = 300) {
  const [value, setValue] = useState(initialValue)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return {
    value,
    debouncedValue,
    setValue,
  }
}
