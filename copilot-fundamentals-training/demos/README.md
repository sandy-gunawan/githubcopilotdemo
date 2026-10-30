# GitHub Copilot Demos & Exercises

Welcome to the comprehensive collection of GitHub Copilot demonstrations and training exercises! This directory contains everything you need to showcase Copilot's capabilities and help others learn to use it effectively.

## 🚀 Quick Start

### Core Training Exercises
| Demo | Description | Duration | Difficulty |
|------|-------------|----------|------------|
| **[Copilot Fundamentals](exercises.md)** | Essential Copilot features and prompt engineering techniques | 30-40 min | Beginner |
| **[Copilot Chat Exercises](copilot-chat-exercises/README.md)** | Interactive chat-based development workflows | 45-60 min | Beginner to Intermediate |

### Specialized Demos

#### Azure Terraform Demo (Indonesian)
- **[Azure to Terraform - short guide and three prompts](copilot-azure-terraform/index.html)** -
  Reviews the March 2025 Copilot for Azure article against current Agent,
  Azure Skills, and MCP guidance. Starts with a local fictional complaint
  portal, then service recommendations and Terraform generation/validation.
  Clearly separates verified local tooling from the unverified legacy Update
  panel and any actual Azure deployment. No cloud changes are made by the guide.
  The [runnable local complaint portal](copilot-azure-terraform/app/README.md)
  supplies real Node.js/Express application context, persistent dummy data,
  status updates, attachments, and API/browser tests.

#### UI/UX Skills A/B/C Demo (Indonesian)
- **[UI/UX Skill Lab - one self-contained HTML guide](copilot-uiux-comparison/index.html)** -
  Compare the exact same prompt with and without a design skill. Two fictional
  banking use cases: an operations dashboard with UI UX Pro Max and a savings
  landing page with Frontend Design. Includes isolated A/B/C workspaces: A has
  no workspace skill, B has pinned upstream skills, and optional C adds
  task-specific planning and evidence-based design review. Dummy data, local
  previews, and a neutral rubric are included; no generated winners are bundled.
  [Setup and source details](copilot-uiux-comparison/README.md).

#### Copilot Skills for Operations & Business (Indonesian)
- **[Banking Skills Lab - Interactive HTML](copilot-skills-banking/index.html)** -
  A five-scenario workshop (about 115 minutes, or pick three demos for a
  45-minute prepared session) using synthetic banking
  fixtures. Create business-process documents with embedded diagrams, C4
  architecture and ADRs, executive PowerPoint decks, and local issue drafts.
  Also includes standalone meeting-minutes and incident-chronology demos, with
  one copy-ready prompt per scenario. Includes pinned skill setup, dummy data, editable diagrams,
  Word/PowerPoint reference outputs, and a downloadable kit.
  [Setup and facilitator guide](copilot-skills-banking/README.md).

#### 🛠️ **Development Workflows**
- **[Copilot Operations](copilot-operations/)** - Real-world phone number validation with Python. Shows how to use Copilot for operational code with proper error handling and regex patterns.
- **[Copilot Features](copilot-features/)** - Enterprise-grade bulk rename demo. Complete codebase transformation from "globex_" to "chroma_" using Copilot Agent, PR summaries, and automated testing workflows.
- **[Node Calculator](Node-calculator/)** - Step-by-step calculator build with Node.js. Perfect for demonstrating prompt engineering, test-driven development, and package.json configuration with Copilot.

#### 🎯 **Advanced Techniques**
- **[Copilot Techniques](copilot-techniques/)** - Model Context Protocol (MCP) server creation. Build a Flask-based knowledge base that integrates private documentation with Copilot Chat for local Q&A.
- **[Copilot Essentials](copilot-essentials/)** - Emergency log triage utility. Transform gzipped access logs into actionable insights using Python, regex parsing, and histogram generation - all with Copilot assistance.
- **[Copilot Prompting](copilot-prompting/)** - Comprehensive prompt engineering patterns and best practices for maximum Copilot effectiveness.

#### 📊 **Real-World Examples**
- **[GitHub Status Integration](GitHub-Status-With-Copilot.md)** - Complete MVC RSS feed reader for GitHub status monitoring. Demonstrates API integration, templating with EJS, and Express.js server setup.
- **[Sample Code Collection](sample_code/)** - Multi-language treasure trove including Java algorithms, COBOL calculator, SQL schemas, Lisp functions, and OpenAPI specifications for cross-language Copilot demos.
- **[OpenAPI Specifications](openAPI-users.yaml)** - Production-ready API documentation examples perfect for demonstrating Copilot's API design and documentation capabilities.

## 📚 How to Navigate the Demos

### For Training Sessions
1. **Start Here**: [Copilot Fundamentals](exercises.md) - Core features and basic prompt engineering
2. **Next**: [Copilot Chat Exercises](copilot-chat-exercises/README.md) - Interactive development workflows
3. **Advanced**: Choose from specialized demos based on your audience's interests

### For Office Hours & Quick Demos
- **[Copilot Operations](copilot-operations/)** - Quick phone number validation demo with immediate visual results. Great for showing practical regex generation and error handling patterns.
- **[Node Calculator](Node-calculator/)** - Perfect starter demo with clear progression from setup to testing. Demonstrates cross-language capabilities and package management integration.
- **[GitHub Status Integration](GitHub-Status-With-Copilot.md)** - Impressive MVC architecture demo with live RSS feeds. Shows API integration, templating, and full-stack development in action.

### For Specific Use Cases
- **Code Review & Documentation**: [Copilot Chat Exercises](copilot-chat-exercises/README.md) - Eight hands-on exercises covering unit testing, code explanation, refactoring, and multilingual development
- **Legacy Code Modernization**: [Sample Code Collection](sample_code/) - Java algorithms, COBOL calculator, SQL schemas, and vintage code patterns perfect for modernization demos
- **API Development**: [OpenAPI Specifications](openAPI-users.yaml) - Complete user profile API with schemas, endpoints, and documentation generation examples
- **Log Analysis & Operations**: [Copilot Essentials](copilot-essentials/) - Production log parsing with gzip handling, regex filtering, and real-time histogram generation

## 🎯 Demo Categories

### **Beginner-Friendly** (🟢)
- **Copilot Fundamentals** - Core autocomplete, prompt engineering, and neighboring tabs
- **Basic Chat Exercises** - Configuration, multilingual support, and simple code explanation  
- **Simple Calculator Examples** - Node.js calculator with step-by-step guidance and testing

### **Intermediate** (🟡) 
- **Advanced Chat Workflows** - Unit testing, refactoring, role prompting, and project-level analysis
- **API Integration Examples** - GitHub status feeds, RSS parsing, and MVC architecture patterns
- **Multi-language Projects** - Java algorithms, SQL schemas, and cross-platform development

### **Advanced** (🔴)
- **Complex Prompting Techniques** - Model Context Protocol (MCP) servers and private knowledge base integration
- **Enterprise Rename Operations** - Bulk codebase transformations with automated testing and PR workflows  
- **Production Log Analysis** - Real-time parsing, filtering, and visualization of compressed log files

## 💡 Tips for Effective Demos

1. **Set Context**: Always start with the business problem you're solving
2. **Show, Don't Tell**: Let Copilot generate code live during the demo
3. **Embrace Variability**: Copilot's responses may vary - use this as a teaching moment
4. **Iterate**: Show how to refine prompts for better results
5. **Verify**: Always demonstrate reviewing and testing generated code

## 🔗 Quick Links

- **[Main Repository README](../README.md)** - Overview and setup instructions
- **[Copilot Configuration Guide](copilot-chat-exercises/configure-copilot.md)** - Setup and configuration
- **[Prompt Engineering Guide](../docs/prompting-exercise-guide.md)** - Best practices for effective prompting

---

**Need help?** Each demo directory contains its own README with specific instructions and objectives. Happy coding with Copilot! 🚀