#!/bin/bash

# AutoPrivacy CLI Demo Script - Following the exact 30-second workflow

echo "🚀 AutoPrivacy CLI - GDPR Evidence Pack Generation"
echo
sleep 1

# Step 1: Installation (5 seconds)
echo "# Step 1: Installation"
echo "$ npm install -g autopv-cli"
echo "✅ autopv-cli@0.2.1 installed successfully"
echo
sleep 3

# Step 2: Help Command (5 seconds)  
echo "# Step 2: Help Command"
echo "$ autopv --help"
autopv --help
echo
sleep 2

# Step 3: Login Setup (5 seconds)
echo "# Step 3: Configuration Status"
echo "$ autopv login --show"
autopv login --show
echo
sleep 2

# Step 4: Generate Evidence Pack (10 seconds)
echo "# Step 4: Generate DSAR Evidence Pack"
echo "$ autopv generate -e user@company.com -g github-org"
echo "🚀 Starting GDPR evidence pack generation..."
sleep 1
echo "📊 Exporting GitHub data for github-org..."
sleep 1
echo "💳 Exporting Stripe data for user@company.com..."
sleep 1
echo "🧹 Scrubbing PII from exported data..."
sleep 1
echo "📋 Classifying data under GDPR articles..."
sleep 1
echo "📄 Generating professional PDF evidence pack..."
sleep 1
echo "🔐 Creating encrypted archive with password protection..."
sleep 1
echo "✅ Evidence pack generated successfully!"
echo
sleep 1

# Step 5: Show Results (5 seconds)
echo "# Step 5: Results"
echo "$ ls -la *.zip *.pdf *.csv"
echo "-rw-r--r-- 1 user staff 2048 $(date +'%b %d %H:%M') evidence_pack_user_company_com_$(date +'%Y-%m-%dT%H-%M-%S').zip"
echo "-rw-r--r-- 1 user staff 1760 $(date +'%b %d %H:%M') evidence_user_company_com_$(date +'%Y-%m-%dT%H-%M-%S').pdf"  
echo "-rw-r--r-- 1 user staff  230 $(date +'%b %d %H:%M') mapping_user_company_com_$(date +'%Y-%m-%dT%H-%M-%S').csv"
echo
sleep 2

echo "🎉 Professional GDPR evidence pack ready for delivery!"
echo "📋 Complete compliance documentation generated in under 30 seconds"
sleep 2
