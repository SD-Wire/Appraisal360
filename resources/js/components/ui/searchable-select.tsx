import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
    value: string | number;
    label: string;
    sublabel?: string;
    disabled?: boolean;
}

export interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string | number | null | undefined;
    onChange: (value: string | number) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    className?: string;
    triggerClassName?: string;
    dropdownClassName?: string;
    size?: "sm" | "default";
    emptyMessage?: string;
    style?: React.CSSProperties;
    triggerStyle?: React.CSSProperties;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select an option...",
    searchPlaceholder = "Type to search...",
    disabled = false,
    required = false,
    name,
    className,
    triggerClassName,
    dropdownClassName,
    size = "default",
    emptyMessage = "No matching options found",
    style,
    triggerStyle,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Selected option
    const selectedOption = useMemo(() => {
        return options.find((opt) => String(opt.value) === String(value));
    }, [options, value]);

    // Filtered options
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const q = searchQuery.toLowerCase();
        return options.filter((opt) => {
            const matchLabel = opt.label.toLowerCase().includes(q);
            const matchSub = opt.sublabel
                ? opt.sublabel.toLowerCase().includes(q)
                : false;
            return matchLabel || matchSub;
        });
    }, [options, searchQuery]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                setSearchQuery("");
                setHighlightedIndex(-1);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    // Reset highlighted index when filtered options change
    useEffect(() => {
        setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
    }, [filteredOptions]);

    const handleSelect = (option: SearchableSelectOption) => {
        if (option.disabled) return;
        onChange(option.value);
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                break;
            case "Enter":
                e.preventDefault();
                if (
                    highlightedIndex >= 0 &&
                    highlightedIndex < filteredOptions.length
                ) {
                    handleSelect(filteredOptions[highlightedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                setIsOpen(false);
                setSearchQuery("");
                setHighlightedIndex(-1);
                break;
            case "Tab":
                setIsOpen(false);
                setSearchQuery("");
                setHighlightedIndex(-1);
                break;
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll("[data-option-item]");
            const currentItem = items[highlightedIndex] as HTMLElement;
            if (currentItem) {
                currentItem.scrollIntoView({
                    block: "nearest",
                });
            }
        }
    }, [highlightedIndex]);

    const isSmall = size === "sm";

    return (
        <div
            ref={containerRef}
            className={cn("relative w-full text-left", className)}
            style={style}
            onKeyDown={handleKeyDown}
        >
            {/* Hidden native input for form compatibility */}
            {name && (
                <input
                    type="hidden"
                    name={name}
                    value={value !== null && value !== undefined ? String(value) : ""}
                    required={required}
                />
            )}

            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen((prev) => !prev);
                        if (!isOpen) {
                            setSearchQuery("");
                        }
                    }
                }}
                className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl border bg-white text-left transition-all outline-none",
                    "focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/20",
                    isSmall
                        ? "px-2.5 py-1.5 text-xs font-medium"
                        : "px-3.5 py-2 text-sm",
                    disabled ? "cursor-not-allowed opacity-50 bg-gray-50" : "hover:border-gray-400 cursor-pointer",
                    triggerClassName
                )}
                style={{
                    borderColor: isOpen ? "#EA580C" : undefined,
                    ...triggerStyle,
                }}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="flex-1 truncate">
                    {selectedOption ? (
                        <span className="font-semibold text-gray-800">
                            {selectedOption.label}
                            {selectedOption.sublabel && (
                                <span className="ml-1.5 text-xs font-normal text-gray-500">
                                    ({selectedOption.sublabel})
                                </span>
                            )}
                        </span>
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </div>
                <ChevronDown
                    className={cn(
                        "text-gray-400 transition-transform duration-200 shrink-0",
                        isSmall ? "h-3.5 w-3.5" : "h-4 w-4",
                        isOpen && "rotate-180 text-[#EA580C]"
                    )}
                />
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div
                    className={cn(
                        "absolute left-0 top-full z-50 mt-1.5 w-full min-w-[200px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95",
                        dropdownClassName
                    )}
                    style={{ borderColor: "#E5E7EB" }}
                >
                    {/* Search Input Box */}
                    <div className="border-b border-gray-100 p-2 bg-gray-50/70">
                        <div className="relative flex items-center">
                            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div
                        ref={listRef}
                        className="max-h-56 overflow-y-auto p-1 text-xs"
                        role="listbox"
                    >
                        {filteredOptions.length === 0 ? (
                            <div className="py-4 text-center text-xs text-gray-400">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option, idx) => {
                                const isSelected =
                                    String(option.value) === String(value);
                                const isHighlighted = idx === highlightedIndex;

                                return (
                                    <button
                                        type="button"
                                        key={String(option.value)}
                                        data-option-item
                                        disabled={option.disabled}
                                        onClick={() => handleSelect(option)}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                                            isSelected
                                                ? "bg-orange-50 font-bold text-orange-900"
                                                : isHighlighted
                                                ? "bg-gray-100 text-gray-900"
                                                : "text-gray-700 hover:bg-gray-50",
                                            option.disabled &&
                                                "cursor-not-allowed opacity-40"
                                        )}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <span className="truncate">
                                                {option.label}
                                            </span>
                                            {option.sublabel && (
                                                <span className="truncate text-[10px] font-normal text-gray-500">
                                                    {option.sublabel}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <Check className="h-3.5 w-3.5 text-[#EA580C] shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchableSelect;
