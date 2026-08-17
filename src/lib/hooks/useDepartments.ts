import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface DepartmentOption {
  id: string
  name_fa: string
}

export function useDepartments() {
  const [departments, setDepartments] = useState<DepartmentOption[]>([])

  const fetchDepartments = useCallback(async () => {
    const { data, error } = await supabase.from('departments').select('id, name_fa').order('name_fa')
    if (!error && data) setDepartments(data)
  }, [])

  useEffect(() => { fetchDepartments() }, [fetchDepartments])

  return { departments, refetchDepartments: fetchDepartments }
}
