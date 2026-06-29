/**
 * Rule-Based AI Engine for TaxCoreAI
 * Processes user queries using pattern matching and predefined rules
 */

class RuleBasedAI {
  constructor() {
    this.rules = []
    this.patterns = []
    this.quickActions = []
    this.initializeRules()
  }

  initializeRules() {
    // Define pattern matching rules
    this.patterns = [
      {
        id: 'taxpayer_search',
        patterns: [/find\s+taxpayer\s+(.+)/i, /search\s+taxpayer\s+(.+)/i, /lookup\s+taxpayer\s+(.+)/i, /get\s+taxpayer\s+(.+)/i],
        intent: 'search_taxpayer',
        description: 'Search for a taxpayer by name or TIN'
      },
      {
        id: 'taxpayer_status',
        patterns: [/what\s+is\s+the\s+status\s+of\s+(.+)/i, /status\s+of\s+(.+)/i, /check\s+status\s+(.+)/i],
        intent: 'check_status',
        description: 'Check the status of a taxpayer or document'
      },
      {
        id: 'document_help',
        patterns: [/what\s+documents?\s+(?:do\s+i\s+)?need/i, /required\s+documents?/i, /documents?\s+required/i, /document\s+requirements/i],
        intent: 'document_requirements',
        description: 'Get information about required documents'
      },
      {
        id: 'registration_help',
        patterns: [/how\s+to\s+register/i, /registration\s+process/i, /register\s+for\s+tax/i, /tax\s+registration/i],
        intent: 'registration_process',
        description: 'Learn about tax registration process'
      },
      {
        id: 'compliance_check',
        patterns: [/am\s+i\s+compliant/i, /compliance\s+status/i, /check\s+compliance/i, /compliance\s+requirements/i],
        intent: 'compliance_info',
        description: 'Get compliance information'
      },
      {
        id: 'workflow_help',
        patterns: [/what\s+is\s+my\s+workflow/i, /workflow\s+status/i, /pending\s+workflows?/i, /my\s+tasks?/i],
        intent: 'workflow_status',
        description: 'Check workflow and task status'
      },
      {
        id: 'vat_info',
        patterns: [/what\s+is\s+vat/i, /vat\s+information/i, /tell\s+me\s+about\s+vat/i, /vat\s+registration/i],
        intent: 'vat_info',
        description: 'Get VAT-related information'
      },
      {
        id: 'paye_info',
        patterns: [/what\s+is\s+paye/i, /paye\s+information/i, /tell\s+me\s+about\s+paye/i, /paye\s+registration/i],
        intent: 'paye_info',
        description: 'Get PAYE-related information'
      },
      {
        id: 'deadline_help',
        patterns: [/when\s+is\s+(?:the\s+)?deadline/i, /tax\s+deadline/i, /filing\s+deadline/i, /due\s+date/i],
        intent: 'deadline_info',
        description: 'Get information about tax deadlines'
      },
      {
        id: 'penalty_info',
        patterns: [/what\s+are\s+penalties?/i, /penalty\s+information/i, /late\s+filing\s+penalty/i, /fines\s+and\s+penalties?/i],
        intent: 'penalty_info',
        description: 'Get information about penalties and fines'
      },
      {
        id: 'contact_help',
        patterns: [/how\s+do\s+i\s+contact/i, /contact\s+information/i, /phone\s+number/i, /email\s+address/i, /office\s+location/i],
        intent: 'contact_info',
        description: 'Get contact information'
      },
      {
        id: 'help_general',
        patterns: [/help/i, /what\s+can\s+you\s+do/i, /how\s+can\s+you\s+help/i, /what\s+do\s+you\s+know/i],
        intent: 'general_help',
        description: 'Get general help and capabilities'
      }
    ]

    // Define response rules
    this.rules = [
      {
        intent: 'search_taxpayer',
        handler: (params, context) => this.handleTaxpayerSearch(params, context)
      },
      {
        intent: 'check_status',
        handler: (params, context) => this.handleStatusCheck(params, context)
      },
      {
        intent: 'document_requirements',
        handler: () => ({
          message: '**Required Documents for Tax Registration:**\n\n' +
            'For Individual Taxpayers:\n' +
            '• National ID / Passport\n' +
            '• Proof of residence\n' +
            '• Recent passport photograph\n\n' +
            'For Business Entities:\n' +
            '• Business registration certificate\n' +
            '• TIN application form\n' +
            '• Memorandum & Articles of Association\n' +
            '• Proof of business address\n' +
            '• Director\'s ID copies\n\n' +
            'Would you like me to help you upload any of these documents?'
        })
      },
      {
        intent: 'registration_process',
        handler: () => ({
          message: '**Tax Registration Process:**\n\n' +
            '1. **Gather Required Documents**\n' +
            '   - Valid ID\n' +
            '   - Proof of residence\n' +
            '   - Business documents (if applicable)\n\n' +
            '2. **Complete Application**\n' +
            '   - Fill out the registration form\n' +
            '   - Upload supporting documents\n\n' +
            '3. **Submit for Review**\n' +
            '   - Your application will be reviewed by our team\n' +
            '   - Typical processing time: 3-5 business days\n\n' +
            '4. **Receive TIN**\n' +
            '   - You\'ll receive your Tax Identification Number\n' +
            '   - Start filing your taxes\n\n' +
            'Would you like to start the registration process?'
        })
      },
      {
        intent: 'compliance_info',
        handler: () => ({
          message: '**Tax Compliance Information:**\n\n' +
            'To maintain good compliance status:\n\n' +
            '✓ File tax returns on time\n' +
            '✓ Pay taxes by due dates\n' +
            '✓ Keep accurate records\n' +
            '✓ Respond to audit requests promptly\n' +
            '✓ Update your information when changes occur\n\n' +
            '**Compliance Status Levels:**\n' +
            '• **Compliant** - All obligations met\n' +
            '• **At Risk** - Missing filings or payments\n' +
            '• **Non-Compliant** - Serious violations\n\n' +
            'Would you like me to check your compliance status?'
        })
      },
      {
        intent: 'workflow_status',
        handler: (params, context) => this.handleWorkflowStatus(params, context)
      },
      {
        intent: 'vat_info',
        handler: () => ({
          message: '**Value Added Tax (VAT) Information:**\n\n' +
            '**What is VAT?**\n' +
            'VAT is a consumption tax applied to goods and services.\n\n' +
            '**Who Should Register?**\n' +
            '• Businesses with annual turnover exceeding 50M RWF\n' +
            '• Importers and exporters\n' +
            '• Service providers\n\n' +
            '**VAT Rates:**\n' +
            '• Standard rate: 18%\n' +
            '• Zero-rated: 0% (exports, certain goods)\n' +
            '• Exempt: Specific categories\n\n' +
            '**Filing Frequency:** Monthly\n\n' +
            'Would you like to register for VAT or need more details?'
        })
      },
      {
        intent: 'paye_info',
        handler: () => ({
          message: '**Pay As You Earn (PAYE) Information:**\n\n' +
            '**What is PAYE?**\n' +
            'PAYE is a system of withholding tax on employment income.\n\n' +
            '**Employer Responsibilities:**\n' +
            '• Register as a PAYE withholding agent\n' +
            '• Deduct tax from employee salaries\n' +
            '• Remit to RRA by the 15th of the following month\n\n' +
            '**Employee Benefits:**\n' +
            '• Automatic tax deduction\n' +
            '• No need to file separate returns (unless other income)\n\n' +
            'Would you like to register for PAYE or need more information?'
        })
      },
      {
        intent: 'deadline_info',
        handler: () => ({
          message: '**Tax Deadlines:**\n\n' +
            '**Monthly Deadlines:**\n' +
            '• PAYE Remittance: 15th of following month\n' +
            '• VAT Returns: 15th of following month\n\n' +
            '**Annual Deadlines:**\n' +
            '• Corporate Tax Returns: Within 4 months of fiscal year end\n' +
            '• Individual Tax Returns: By March 31st\n\n' +
            '**Important Notes:**\n' +
            '• Late filing may result in penalties\n' +
            '• Extensions may be requested in special circumstances\n' +
            '• Keep track of your obligations in the dashboard\n\n' +
            'Would you like me to check your specific deadlines?'
        })
      },
      {
        intent: 'penalty_info',
        handler: () => ({
          message: '**Penalties and Fines:**\n\n' +
            '**Common Penalties:**\n\n' +
            '• **Late Filing:** 5% of tax due + 1.5% per month\n' +
            '• **Late Payment:** 10% of tax due + interest\n' +
            '• **Failure to Register:** 500,000 RWF to 1M RWF\n' +
            '• **Incorrect Returns:** 100% of understated tax\n\n' +
            '**How to Avoid Penalties:**\n' +
            '✓ File and pay on time\n' +
            '✓ Keep accurate records\n' +
            '✓ Respond to RRA communications\n' +
            '✓ Register when required\n\n' +
            'Would you like more specific information about any penalty?'
        })
      },
      {
        intent: 'contact_info',
        handler: () => ({
          message: '**Contact Rwanda Revenue Authority:**\n\n' +
            '**Head Office:**\n' +
            'KG 2 Roundabout, Kigali\n' +
            'P.O. Box 175, Kigali, Rwanda\n\n' +
            '**Phone:** +250 252 588 000\n' +
            '**Email:** info@rra.gov.rw\n' +
            '**Website:** www.rra.gov.rw\n\n' +
            '**Operating Hours:**\n' +
            'Monday - Friday: 8:00 AM - 5:00 PM\n\n' +
            '**Regional Offices:** Available in all provinces\n\n' +
            'Is there anything specific you\'d like assistance with?'
        })
      },
      {
        intent: 'general_help',
        handler: () => ({
          message: '**Welcome to TaxCoreAI Assistant!**\n\n' +
            'I can help you with:\n\n' +
            '📋 **Taxpayer Management**\n' +
            '   - Search for taxpayers\n' +
            '   - Check registration status\n' +
            '   - Update taxpayer information\n\n' +
            '📄 **Document Assistance**\n' +
            '   - Document requirements\n' +
            '   - Upload guidance\n' +
            '   - Document analysis\n\n' +
            '📊 **Compliance & Workflows**\n' +
            '   - Check compliance status\n' +
            '   - View pending tasks\n' +
            '   - Track workflows\n\n' +
            '💰 **Tax Information**\n' +
            '   - VAT and PAYE details\n' +
            '   - Tax deadlines\n' +
            '   - Penalty information\n\n' +
            '💡 **Quick Actions:**\n' +
            'Use the buttons below or type your question!\n\n' +
            'How can I assist you today?'
        })
      }
    ]

    // Define quick action buttons
    this.quickActions = [
      { id: 'search_taxpayer', label: '🔍 Search Taxpayer', query: 'Find taxpayer' },
      { id: 'document_help', label: '📄 Document Requirements', query: 'What documents do I need?' },
      { id: 'registration_help', label: '📝 Registration Process', query: 'How to register for tax?' },
      { id: 'compliance_check', label: '✓ Check Compliance', query: 'Am I compliant?' },
      { id: 'workflow_help', label: '📋 My Workflows', query: 'What is my workflow status?' },
      { id: 'vat_info', label: '💰 VAT Information', query: 'Tell me about VAT' },
      { id: 'deadline_help', label: '📅 Tax Deadlines', query: 'When is the deadline?' },
      { id: 'contact_help', label: '📞 Contact RRA', query: 'Contact information' }
    ]
  }

  /**
   * Process a user query and return a response
   */
  async processQuery(query, context = {}) {
    const lowerQuery = query.toLowerCase().trim()

    // Check for greetings
    if (this.isGreeting(lowerQuery)) {
      return {
        message: 'Hello! I\'m your TaxCoreAI Assistant. How can I help you today?\n\n' +
          'You can ask me about:\n' +
          '• Taxpayer searches\n' +
          '• Document requirements\n' +
          '• Registration processes\n' +
          '• Compliance information\n' +
          '• Tax deadlines and penalties\n\n' +
          'What would you like to know?',
        quickActions: this.quickActions.slice(0, 4)
      }
    }

    // Check for thanks
    if (this.isThanks(lowerQuery)) {
      return {
        message: 'You\'re welcome! Is there anything else I can help you with?',
        quickActions: this.quickActions.slice(0, 4)
      }
    }

    // Match query against patterns
    const matchedPattern = this.matchPattern(lowerQuery)

    if (matchedPattern) {
      const rule = this.rules.find(r => r.intent === matchedPattern.intent)
      if (rule) {
        const result = await rule.handler(matchedPattern.params, context)
        return {
          message: result.message,
          quickActions: result.quickActions || this.getRelatedQuickActions(matchedPattern.intent),
          data: result.data
        }
      }
    }

    // Default response for unmatched queries
    return {
      message: 'I\'m not sure I understand your question. Let me help you with some common topics:\n\n' +
        '• Taxpayer searches and information\n' +
        '• Document requirements\n' +
        '• Registration processes\n' +
        '• Compliance and deadlines\n' +
        '• VAT and PAYE information\n\n' +
        'Could you please rephrase your question or select one of the quick actions below?',
      quickActions: this.quickActions
    }
  }

  /**
   * Match user query against defined patterns
   */
  matchPattern(query) {
    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        const match = query.match(regex)
        if (match) {
          return {
            ...pattern,
            params: match[1] ? match[1].trim() : null
          }
        }
      }
    }
    return null
  }

  /**
   * Handle taxpayer search intent
   */
  async handleTaxpayerSearch(params, context) {
    if (!params) {
      return {
        message: 'I can help you search for a taxpayer. Please provide either:\n\n' +
          '• Taxpayer name\n' +
          '• Tax Identification Number (TIN)\n\n' +
          'Example: "Find taxpayer John Doe" or "Search TIN 123456789"',
        quickActions: this.quickActions.filter(q => q.id === 'search_taxpayer')
      }
    }

    // Return search parameters to be used by the API
    return {
      message: `I'll search for: "${params}"\n\nPlease wait while I retrieve the information...`,
      intent: 'search_taxpayer',
      searchQuery: params,
      quickActions: [
        { id: 'search_taxpayer', label: '🔍 New Search', query: 'Find taxpayer' },
        { id: 'workflow_help', label: '📋 View Workflows', query: 'What is my workflow status?' }
      ]
    }
  }

  /**
   * Handle status check intent
   */
  async handleStatusCheck(params, context) {
    if (!params) {
      return {
        message: 'I can help you check the status of:\n\n' +
          '• A taxpayer (by name or TIN)\n' +
          '• A document\n' +
          '• A workflow or task\n\n' +
          'Please specify what you\'d like to check.',
        quickActions: [
          { id: 'search_taxpayer', label: '🔍 Search Taxpayer', query: 'Find taxpayer' },
          { id: 'workflow_help', label: '📋 Check Workflows', query: 'What is my workflow status?' }
        ]
      }
    }

    return {
      message: `I'll check the status for: "${params}"\n\nPlease wait...`,
      intent: 'check_status',
      searchQuery: params,
      quickActions: [
        { id: 'search_taxpayer', label: '🔍 New Search', query: 'Find taxpayer' },
        { id: 'compliance_check', label: '✓ Compliance Info', query: 'Am I compliant?' }
      ]
    }
  }

  /**
   * Handle workflow status intent
   */
  async handleWorkflowStatus(params, context) {
    return {
      message: 'I can help you check your workflow status. Let me retrieve your pending tasks and workflows...',
      intent: 'workflow_status',
      quickActions: [
        { id: 'workflow_help', label: '🔄 Refresh Status', query: 'What is my workflow status?' },
        { id: 'compliance_check', label: '✓ Compliance Info', query: 'Am I compliant?' }
      ]
    }
  }

  /**
   * Get related quick actions based on intent
   */
  getRelatedQuickActions(intent) {
    const relatedMap = {
      'search_taxpayer': ['workflow_help', 'compliance_check', 'document_help'],
      'check_status': ['search_taxpayer', 'workflow_help', 'compliance_check'],
      'document_requirements': ['registration_help', 'upload_document'],
      'registration_process': ['document_help', 'contact_help'],
      'compliance_info': ['workflow_help', 'deadline_help'],
      'workflow_status': ['compliance_check', 'search_taxpayer'],
      'vat_info': ['paye_info', 'registration_help'],
      'paye_info': ['vat_info', 'registration_help'],
      'deadline_help': ['penalty_info', 'compliance_check'],
      'penalty_info': ['deadline_help', 'compliance_check'],
      'contact_help': ['registration_help', 'document_help']
    }

    const relatedIds = relatedMap[intent] || ['help_general']
    return this.quickActions.filter(q => relatedIds.includes(q.id))
  }

  /**
   * Check if query is a greeting
   */
  isGreeting(query) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy']
    return greetings.some(greeting => query.startsWith(greeting))
  }

  /**
   * Check if query is expressing thanks
   */
  isThanks(query) {
    const thanks = ['thank', 'thanks', 'thx', 'appreciate']
    return thanks.some(thank => query.includes(thank))
  }

  /**
   * Get all available quick actions
   */
  getQuickActions() {
    return this.quickActions
  }

  /**
   * Get suggested queries based on context
   */
  getSuggestedQueries(context = {}) {
    const suggestions = []

    // Context-aware suggestions
    if (context.role === 'admin' || context.role === 'officer') {
      suggestions.push(
        { label: 'Search for a taxpayer', query: 'Find taxpayer' },
        { label: 'Check pending workflows', query: 'What is my workflow status?' }
      )
    }

    if (context.role === 'auditor') {
      suggestions.push(
        { label: 'Check compliance status', query: 'Am I compliant?' },
        { label: 'View audit requirements', query: 'What documents do I need?' }
      )
    }

    // Add general suggestions
    suggestions.push(
      { label: 'Registration process', query: 'How to register for tax?' },
      { label: 'Tax deadlines', query: 'When is the deadline?' }
    )

    return suggestions.slice(0, 4)
  }
}

// Export singleton instance
export const ruleBasedAI = new RuleBasedAI()

export default RuleBasedAI