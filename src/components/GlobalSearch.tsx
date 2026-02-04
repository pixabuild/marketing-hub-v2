"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  category?: { name: string } | null;
}

interface Sale {
  id: string;
  platform: string;
  amount: number;
  saleDate: string;
  project?: { name: string } | null;
}

interface Expense {
  id: string;
  description: string | null;
  category: string;
  amount: number;
  expenseDate: string;
  project?: { name: string } | null;
}

interface SearchResults {
  transactions: Transaction[];
  sales: Sale[];
  expenses: Expense[];
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ transactions: [], sales: [], expenses: [] });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults({ transactions: [], sales: [], expenses: [] });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleResultClick = (type: string, id: string) => {
    setIsOpen(false);
    setQuery("");
    if (type === "transaction") {
      router.push("/financial-tracker");
    } else if (type === "sale") {
      router.push("/affiliate-hq");
    } else if (type === "expense") {
      router.push("/affiliate-hq/expenses");
    }
  };

  const hasResults = results.transactions.length > 0 || results.sales.length > 0 || results.expenses.length > 0;

  return (
    <>
      <button
        className="search-btn"
        onClick={() => setIsOpen(true)}
        title="Search (Ctrl+K)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </button>

      {isOpen && (
        <div className="modal-backdrop open" onClick={() => setIsOpen(false)}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-input-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search transactions, sales, expenses..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {loading && <div className="search-spinner" />}
              <kbd className="search-kbd">ESC</kbd>
            </div>

            <div className="search-results">
              {query.length < 2 ? (
                <div className="search-hint">
                  Type at least 2 characters to search
                </div>
              ) : !hasResults && !loading ? (
                <div className="search-empty">
                  No results found for &quot;{query}&quot;
                </div>
              ) : (
                <>
                  {results.transactions.length > 0 && (
                    <div className="search-section">
                      <div className="search-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <path d="M8 21h8M12 17v4" />
                        </svg>
                        Transactions
                      </div>
                      {results.transactions.map((tx) => (
                        <button
                          key={tx.id}
                          className="search-result-item"
                          onClick={() => handleResultClick("transaction", tx.id)}
                        >
                          <div className={`search-result-indicator ${tx.type}`}>
                            {tx.type === "income" ? "+" : "-"}
                          </div>
                          <div className="search-result-content">
                            <div className="search-result-title">{tx.description}</div>
                            <div className="search-result-meta">
                              {tx.category?.name || "Uncategorized"} &bull; {formatDate(tx.date)}
                            </div>
                          </div>
                          <div className={`search-result-amount ${tx.type}`}>
                            {formatCurrency(tx.amount)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.sales.length > 0 && (
                    <div className="search-section">
                      <div className="search-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </svg>
                        Sales
                      </div>
                      {results.sales.map((sale) => (
                        <button
                          key={sale.id}
                          className="search-result-item"
                          onClick={() => handleResultClick("sale", sale.id)}
                        >
                          <div className="search-result-indicator income">+</div>
                          <div className="search-result-content">
                            <div className="search-result-title">{sale.platform}</div>
                            <div className="search-result-meta">
                              {sale.project?.name || "No project"} &bull; {formatDate(sale.saleDate)}
                            </div>
                          </div>
                          <div className="search-result-amount income">
                            {formatCurrency(sale.amount)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.expenses.length > 0 && (
                    <div className="search-section">
                      <div className="search-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 4H3M21 12H3M21 20H3" />
                        </svg>
                        Expenses
                      </div>
                      {results.expenses.map((expense) => (
                        <button
                          key={expense.id}
                          className="search-result-item"
                          onClick={() => handleResultClick("expense", expense.id)}
                        >
                          <div className="search-result-indicator expense">-</div>
                          <div className="search-result-content">
                            <div className="search-result-title">
                              {expense.description || expense.category}
                            </div>
                            <div className="search-result-meta">
                              {expense.project?.name || "No project"} &bull; {formatDate(expense.expenseDate)}
                            </div>
                          </div>
                          <div className="search-result-amount expense">
                            {formatCurrency(expense.amount)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
