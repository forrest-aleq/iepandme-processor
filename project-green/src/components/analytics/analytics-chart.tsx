"use client"

import { useEffect, useRef } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js"
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2"
import type { ChartData } from "@/lib/analytics/types"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
)

interface AnalyticsChartProps {
  type: "line" | "bar" | "pie" | "doughnut"
  data: ChartData
  options?: any
  height?: number
}

export function AnalyticsChart({ type, data, options = {}, height = 300 }: AnalyticsChartProps) {
  const chartRef = useRef<any>(null)

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
      },
    },
    scales:
      type === "pie" || type === "doughnut"
        ? undefined
        : {
            x: {
              grid: {
                color: "rgba(0, 0, 0, 0.1)",
              },
            },
            y: {
              grid: {
                color: "rgba(0, 0, 0, 0.1)",
              },
              beginAtZero: true,
            },
          },
    ...options,
  }

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [])

  const chartProps = {
    ref: chartRef,
    data,
    options: defaultOptions,
    height,
  }

  switch (type) {
    case "line":
      return <Line {...chartProps} />
    case "bar":
      return <Bar {...chartProps} />
    case "pie":
      return <Pie {...chartProps} />
    case "doughnut":
      return <Doughnut {...chartProps} />
    default:
      return <div className="flex items-center justify-center h-64 text-gray-500">Unsupported chart type</div>
  }
}
