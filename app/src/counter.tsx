import { useState } from "react";

interface CounterProps {
  initialCount?: number;
  onCountChange?: (count: number) => void;
  label?: string;
}

export function Counter({
  initialCount = 0,
  onCountChange,
  label = "Count",
}: CounterProps) {
  const [count, setCount] = useState(initialCount);

  const increment = () => {
    const next = count + 1;
    setCount(next);
    onCountChange?.(next);
  };

  const decrement = () => {
    const next = count - 1;
    setCount(next);
    onCountChange?.(next);
  };

  return (
    <div>
      <p aria-label={label}>
        {label}: {count}
      </p>
      <button onClick={increment} aria-label="Increment">
        +
      </button>
      <button onClick={decrement} aria-label="Decrement">
        -
      </button>
    </div>
  );
}
