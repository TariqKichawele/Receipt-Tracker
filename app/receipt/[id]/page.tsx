'use client'

import React from 'react'
import { useParams } from 'next/navigation'

const Receipt = () => {
    const params = useParams<{ id: string }>();
  return (
    <div>Receipt {params.id}</div>
  )
}

export default Receipt