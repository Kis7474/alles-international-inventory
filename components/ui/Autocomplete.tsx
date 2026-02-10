'use client'

import { useState, useRef, useEffect } from 'react'

interface AutocompleteOption {
  id: number
  label: string
  sublabel?: string
}

interface AutocompleteProps {
  options: AutocompleteOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export default function Autocomplete({
  options,
  value,
  onChange,
  placeholder = '검색하세요',
  label,
  required = false,
  disabled = false,
  className = '',
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedOption, setSelectedOption] = useState<AutocompleteOption | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Update selected option when value changes
  useEffect(() => {
    if (value) {
      const option = options.find(opt => opt.id.toString() === value)
      setSelectedOption(option || null)
      setSearchText(option?.label || '')
    } else {
      setSelectedOption(null)
      setSearchText('')
    }
  }, [value, options])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleInputChange = (text: string) => {
    setSearchText(text)
    setIsOpen(true)
    if (!text) {
      onChange('')
      setSelectedOption(null)
    }
  }

  const handleSelectOption = (option: AutocompleteOption) => {
    setSelectedOption(option)
    setSearchText(option.label)
    onChange(option.id.toString())
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchText('')
    setSelectedOption(null)
    onChange('')
    setIsOpen(false)
  }

  const filteredOptions = options.filter(option => {
    const searchLower = searchText.toLowerCase()
    return (
      option.label.toLowerCase().includes(searchLower) ||
      (option.sublabel && option.sublabel.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-1 text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-3 py-2 pr-16 border rounded-lg text-gray-900 disabled:bg-gray-100"
          />
          {searchText && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={disabled}
          >
            ▼
          </button>
        </div>
        
        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <ul>
                {filteredOptions.map((option) => (
                  <li
                    key={option.id}
                    onClick={() => handleSelectOption(option)}
                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                      selectedOption?.id === option.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="text-gray-900">{option.label}</div>
                    {option.sublabel && (
                      <div className="text-sm text-gray-500">{option.sublabel}</div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-gray-500">검색 결과가 없습니다.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
