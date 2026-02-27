export interface CouponConfig {
    Rules: CouponRule[];
}

export interface CouponRule {
    RuleValue: string;        // e.g., "2304"
    RuleDescription: string;  // e.g., "CCNEM 20% excepto tooniforms..."

    /** * ComparisonType determines how the RuleValue is evaluated
     * (e.g., 0 for Equals, 1 for Contains, 2 for In List)
     */
    ComparisonType: number;

    /** * ContextType determines what part of the system the rule applies to
     * (e.g., 7 for Product Category, 5 for Brand, etc.)
     */
    ContextType: number;
}

export interface ContextDetail {
    value: number;
    name?: string;
    type: number;
    typeName?: string;
}

export interface CouponContext {
    // The context array can contain either numbers or ContextDetail objects
    context: ContextDetail[];
}