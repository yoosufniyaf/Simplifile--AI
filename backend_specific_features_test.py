import requests
import sys
import json
import base64
from datetime import datetime
import random
import string

class SimplifileSpecificFeaturesTest:
    def __init__(self, base_url="https://ai-cfo-hub.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "passed": success,
            "details": details
        })

    def generate_test_user(self):
        """Generate unique test user data"""
        suffix = ''.join(random.choices(string.digits, k=4))
        return {
            "name": f"Test User {suffix}",
            "email": f"test{suffix}@example.com",
            "password": "TestPass123!"
        }

    def setup_user(self):
        """Create and authenticate a test user"""
        print("🔑 Setting up test user...")
        user_data = self.generate_test_user()
        
        response = requests.post(f"{self.base_url}/auth/register", json=user_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token')
            self.user_id = data.get('user', {}).get('id')
            print("✅ Test user created and authenticated")
            return True
        else:
            print(f"❌ Failed to create test user: {response.status_code}")
            return False

    def test_document_upload_and_analysis(self):
        """Test document upload and analysis with structured response"""
        print("\n🔍 Testing Document Upload & Analysis...")
        
        if not self.token:
            print("❌ Cannot test - no authentication token")
            return
        
        # Create a mock file content
        test_content = """
        BUSINESS AGREEMENT
        
        This agreement is between Company A and Company B for the provision of software services.
        
        Terms:
        - Payment due within 30 days
        - Service level agreement of 99.9% uptime
        - Either party may terminate with 30 days notice
        - Company A will provide 24/7 support
        
        Risks:
        - Liability is limited to $10,000
        - No warranty on third-party integrations
        """
        
        # Create a mock file upload
        files = {
            'file': ('test_agreement.txt', test_content, 'text/plain')
        }
        
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            # Test document upload
            upload_response = requests.post(
                f"{self.base_url}/documents/upload", 
                files=files, 
                headers=headers, 
                timeout=10
            )
            
            if upload_response.status_code == 200:
                self.log_test("Document upload", True)
                upload_data = upload_response.json()
                doc_id = upload_data.get('id')
                
                if doc_id:
                    # Test document analysis
                    analysis_response = requests.post(
                        f"{self.base_url}/documents/{doc_id}/analyze",
                        headers={**headers, 'Content-Type': 'application/json'},
                        timeout=30  # Analysis might take longer
                    )
                    
                    if analysis_response.status_code == 200:
                        self.log_test("Document analysis", True)
                        analysis_data = analysis_response.json()
                        
                        # Check for required structured fields
                        required_fields = [
                            'summary', 'key_points', 'risks', 'obligations', 
                            'simple_explanation', 'what_this_means'
                        ]
                        
                        missing_fields = []
                        for field in required_fields:
                            if field not in analysis_data or analysis_data[field] is None:
                                missing_fields.append(field)
                        
                        if not missing_fields:
                            self.log_test("Document analysis structured response", True)
                            
                            # Verify 'what_this_means' field specifically (required feature)
                            what_this_means = analysis_data.get('what_this_means')
                            if what_this_means and isinstance(what_this_means, str) and len(what_this_means) > 10:
                                self.log_test("'What This Means For You' section present", True)
                            else:
                                self.log_test("'What This Means For You' section present", False, 
                                            "Field missing or empty")
                            
                            # Verify key_points is a list
                            key_points = analysis_data.get('key_points')
                            if isinstance(key_points, list) and len(key_points) > 0:
                                self.log_test("Key points as list", True)
                            else:
                                self.log_test("Key points as list", False, "Should be non-empty list")
                            
                            # Verify risks is a list
                            risks = analysis_data.get('risks')
                            if isinstance(risks, list):
                                self.log_test("Risks as list", True)
                            else:
                                self.log_test("Risks as list", False, "Should be list")
                        else:
                            self.log_test("Document analysis structured response", False, 
                                        f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Document analysis", False, 
                                    f"Status: {analysis_response.status_code}")
                else:
                    self.log_test("Document upload", False, "No document ID returned")
            else:
                self.log_test("Document upload", False, f"Status: {upload_response.status_code}")
                
        except Exception as e:
            self.log_test("Document upload and analysis", False, f"Error: {str(e)}")

    def test_bookkeeping_insights_with_ai_analysis(self):
        """Test bookkeeping insights endpoint returns ai_analysis field"""
        print("\n🔍 Testing Bookkeeping Insights AI Analysis...")
        
        if not self.token:
            print("❌ Cannot test - no authentication token")
            return
        
        # First upgrade user to premium to access bookkeeping
        upgrade_data = {"plan": "premium", "billing_cycle": "monthly"}
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        try:
            # Upgrade to premium
            upgrade_response = requests.post(
                f"{self.base_url}/subscription/update",
                json=upgrade_data,
                headers=headers,
                timeout=10
            )
            
            if upgrade_response.status_code == 200:
                self.log_test("Upgrade to premium for bookkeeping access", True)
                
                # Add some test transactions first
                test_transactions = [
                    {
                        "description": "AWS Hosting",
                        "amount": 150.00,
                        "category": "hosting",
                        "date": "2024-01-01",
                        "type": "expense"
                    },
                    {
                        "description": "Software License",
                        "amount": 99.99,
                        "category": "software", 
                        "date": "2024-01-02",
                        "type": "expense"
                    },
                    {
                        "description": "Customer Payment",
                        "amount": 1000.00,
                        "category": "revenue",
                        "date": "2024-01-03",
                        "type": "income"
                    }
                ]
                
                # Add transactions
                for trans in test_transactions:
                    trans_response = requests.post(
                        f"{self.base_url}/bookkeeping/transactions",
                        json=trans,
                        headers=headers,
                        timeout=10
                    )
                    # We don't need to check each individual transaction
                
                print("💡 Added test transactions for analysis...")
                
                # Now test bookkeeping insights
                insights_response = requests.get(
                    f"{self.base_url}/bookkeeping/insights",
                    headers=headers,
                    timeout=30  # AI analysis might take time
                )
                
                if insights_response.status_code == 200:
                    self.log_test("Bookkeeping insights endpoint", True)
                    insights_data = insights_response.json()
                    
                    # Check for ai_analysis field (required feature)
                    ai_analysis = insights_data.get('ai_analysis')
                    if ai_analysis and isinstance(ai_analysis, str) and len(ai_analysis) > 10:
                        self.log_test("AI analysis field present in insights", True)
                        
                        # Check if it's marked as mock or ai-generated
                        generated_by = insights_data.get('generated_by', 'unknown')
                        if generated_by in ['mock', 'ai']:
                            self.log_test("AI analysis generation source identified", True)
                        else:
                            self.log_test("AI analysis generation source identified", False,
                                        f"Unexpected source: {generated_by}")
                    else:
                        self.log_test("AI analysis field present in insights", False,
                                    "Field missing, empty, or too short")
                    
                    # Verify other financial metrics exist
                    required_metrics = ['mrr', 'burn_rate', 'profit_margin', 'total_income', 'total_expenses']
                    missing_metrics = [m for m in required_metrics if m not in insights_data]
                    
                    if not missing_metrics:
                        self.log_test("Financial metrics in insights", True)
                    else:
                        self.log_test("Financial metrics in insights", False,
                                    f"Missing: {missing_metrics}")
                else:
                    self.log_test("Bookkeeping insights endpoint", False,
                                f"Status: {insights_response.status_code}")
            else:
                self.log_test("Upgrade to premium for bookkeeping access", False,
                            f"Status: {upgrade_response.status_code}")
                
        except Exception as e:
            self.log_test("Bookkeeping insights test", False, f"Error: {str(e)}")

    def test_chat_structured_response(self):
        """Test chat endpoint returns structured response"""
        print("\n🔍 Testing Chat Structured Response...")
        
        if not self.token:
            print("❌ Cannot test - no authentication token")
            return
        
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        # Test chat with a specific question
        chat_data = {
            "message": "Can you explain the risks in a typical software license agreement?"
        }
        
        try:
            chat_response = requests.post(
                f"{self.base_url}/chat",
                json=chat_data,
                headers=headers,
                timeout=30
            )
            
            if chat_response.status_code == 200:
                self.log_test("Chat endpoint response", True)
                chat_data = chat_response.json()
                
                # Verify structured response fields
                required_fields = ['id', 'user_message', 'ai_response', 'created_at']
                missing_fields = [f for f in required_fields if f not in chat_data]
                
                if not missing_fields:
                    self.log_test("Chat structured response", True)
                    
                    # Check if AI response has structured format (from AI_COPILOT_PROMPT)
                    ai_response = chat_data.get('ai_response', '')
                    if 'Answer' in ai_response and 'What This Means For You' in ai_response:
                        self.log_test("Chat includes 'What This Means For You' section", True)
                    else:
                        self.log_test("Chat includes 'What This Means For You' section", False,
                                    "Expected structured format not found")
                else:
                    self.log_test("Chat structured response", False, f"Missing: {missing_fields}")
            else:
                self.log_test("Chat endpoint response", False, f"Status: {chat_response.status_code}")
                
        except Exception as e:
            self.log_test("Chat structured response test", False, f"Error: {str(e)}")

    def run_specific_tests(self):
        """Run specific feature tests"""
        print("🚀 Testing Simplifile AI Specific Features")
        print("=" * 60)
        
        # Setup authentication
        if not self.setup_user():
            print("❌ Cannot proceed without authentication")
            return 1
        
        # Run specific tests for requirements
        self.test_document_upload_and_analysis()
        self.test_bookkeeping_insights_with_ai_analysis() 
        self.test_chat_structured_response()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Specific Features Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All specific feature tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            print("\nFailed tests:")
            for test in self.test_results:
                if not test['passed']:
                    print(f"  - {test['name']}: {test['details']}")
            return 1

def main():
    print("Testing Simplifile AI Specific Features...")
    print("Base URL: https://ai-cfo-hub.preview.emergentagent.com/api")
    
    tester = SimplifileSpecificFeaturesTest()
    return tester.run_specific_tests()

if __name__ == "__main__":
    sys.exit(main())