"""FastMCP server for Hong Kong Legislative Council open data APIs."""

import json
import re
from datetime import datetime
from typing import Any, Dict, Optional
from urllib.parse import quote

import httpx
from fastmcp import FastMCP
from bs4 import BeautifulSoup


class LegCoAPIError(Exception):
    """Exception raised for LegCo API errors."""
    pass


class LegCoSearchMCP:
    """MCP server for LegCo open data APIs."""
    
    BASE_URLS = {
        'voting': 'https://app.legco.gov.hk/vrdb/odata/vVotingResult',
        'bills': 'https://app.legco.gov.hk/BillsDB/odata/Vbills',
        'questions_oral': 'https://app.legco.gov.hk/QuestionsDB/odata/ViewOralQuestionsEng',
        'questions_written': 'https://app.legco.gov.hk/QuestionsDB/odata/ViewWrittenQuestionsEng',
        'hansard': 'https://app.legco.gov.hk/OpenData/HansardDB/Hansard',
        'hansard_questions': 'https://app.legco.gov.hk/OpenData/HansardDB/Questions',
        'hansard_bills': 'https://app.legco.gov.hk/OpenData/HansardDB/Bills',
        'hansard_motions': 'https://app.legco.gov.hk/OpenData/HansardDB/Motions',
        'hansard_voting': 'https://app.legco.gov.hk/OpenData/HansardDB/VotingResults',
    }
    
    def __init__(self):
        # Configure httpx client with better defaults for reliability
        self.client = httpx.Client(
            timeout=30.0,
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            transport=httpx.HTTPTransport(retries=3)
        )
        self.mcp = FastMCP("LegCo Search")
        self._register_tools()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()
    
    def _validate_date_format(self, date_str: str) -> bool:
        """Validate date format YYYY-MM-DD."""
        if not date_str:
            return True
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
            return True
        except ValueError:
            return False
    
    def _sanitize_string(self, value: str) -> str:
        """Sanitize string input to prevent injection attacks."""
        if not value:
            return value
        # Remove or escape potentially dangerous characters
        # Allow only alphanumeric, spaces, hyphens, and common punctuation
        sanitized = re.sub(r"[^\w\s\-.,()[\]']", "", value)
        # Escape single quotes for OData
        sanitized = sanitized.replace("'", "''")
        return sanitized[:500]  # Limit length
    
    def _validate_enum(self, value: str, allowed_values: list) -> bool:
        """Validate enum values."""
        return value in allowed_values
    
    def _extract_xml_count(self, xml_content: str) -> Optional[int]:
        """Extract total count from XML response with inlinecount."""
        try:
            # Simple regex to find count in XML (more robust than full XML parsing for this case)
            count_match = re.search(r'<m:count>(\d+)</m:count>', xml_content)
            if count_match:
                return int(count_match.group(1))
        except Exception:
            pass
        return None
    
    def _register_tools(self):
        """Register MCP tools."""
        
        @self.mcp.tool()
        def search_voting_results(
            meeting_type: Optional[str] = None,
            start_date: Optional[str] = None,
            end_date: Optional[str] = None,
            member_name: Optional[str] = None,
            motion_keywords: Optional[str] = None,
            term_no: Optional[int] = None,
            top: int = 100,
            skip: int = 0,
            format: str = "json"
        ) -> Dict[str, Any]:
            """Search voting results from LegCo meetings.
            
            Args:
                meeting_type: Type of meeting ('Council Meeting', 'House Committee', 'Finance Committee', 'Establishment Subcommittee', 'Public Works Subcommittee')
                start_date: Start date in YYYY-MM-DD format
                end_date: End date in YYYY-MM-DD format
                member_name: Name of member (partial match)
                motion_keywords: Keywords to search in motion text
                term_no: Legislative Council term number (5, 6, 7)
                top: Number of records to return (default 100)
                skip: Number of records to skip (default 0)
                format: Return format ('json' or 'xml')
            
            Returns:
                Dictionary containing voting results
            """
            # Validate inputs
            if meeting_type and not self._validate_enum(meeting_type, [
                'Council Meeting', 'House Committee', 'Finance Committee', 
                'Establishment Subcommittee', 'Public Works Subcommittee'
            ]):
                raise ValueError(f"Invalid meeting_type: {meeting_type}")
            
            if start_date and not self._validate_date_format(start_date):
                raise ValueError(f"Invalid start_date format: {start_date}. Use YYYY-MM-DD")
            
            if end_date and not self._validate_date_format(end_date):
                raise ValueError(f"Invalid end_date format: {end_date}. Use YYYY-MM-DD")
            
            if term_no and (not isinstance(term_no, int) or term_no < 1):
                raise ValueError(f"Invalid term_no: {term_no}. Must be a positive integer")
            
            if top < 1 or top > 1000:
                raise ValueError(f"Invalid top: {top}. Must be between 1 and 1000")
            
            if skip < 0:
                raise ValueError(f"Invalid skip: {skip}. Must be non-negative")
            
            if format not in ['json', 'xml']:
                raise ValueError(f"Invalid format: {format}. Must be 'json' or 'xml'")
            
            return self._search_odata_endpoint('voting', {
                'meeting_type': meeting_type,
                'start_date': start_date,
                'end_date': end_date,
                'member_name': member_name,
                'motion_keywords': motion_keywords,
                'term_no': term_no,
                'top': top,
                'skip': skip,
                'format': format
            })
        
        @self.mcp.tool()
        def search_bills(
            title_keywords: Optional[str] = None,
            gazette_year: Optional[int] = None,
            gazette_start_date: Optional[str] = None,
            gazette_end_date: Optional[str] = None,
            top: int = 100,
            skip: int = 0,
            format: str = "json"
        ) -> Dict[str, Any]:
            """Search bills from LegCo database.
            
            Args:
                title_keywords: Keywords to search in bill titles
                gazette_year: Year when bill was gazetted
                gazette_start_date: Start date in YYYY-MM-DD format
                gazette_end_date: End date in YYYY-MM-DD format
                top: Number of records to return (default 100)
                skip: Number of records to skip (default 0)
                format: Return format ('json' or 'xml')
            
            Returns:
                Dictionary containing bill information
            """
            # Validate inputs
            if gazette_year and (not isinstance(gazette_year, int) or gazette_year < 1800 or gazette_year > 2100):
                raise ValueError(f"Invalid gazette_year: {gazette_year}. Must be between 1800 and 2100")
            
            if gazette_start_date and not self._validate_date_format(gazette_start_date):
                raise ValueError(f"Invalid gazette_start_date format: {gazette_start_date}. Use YYYY-MM-DD")
            
            if gazette_end_date and not self._validate_date_format(gazette_end_date):
                raise ValueError(f"Invalid gazette_end_date format: {gazette_end_date}. Use YYYY-MM-DD")
            
            if top < 1 or top > 1000:
                raise ValueError(f"Invalid top: {top}. Must be between 1 and 1000")
            
            if skip < 0:
                raise ValueError(f"Invalid skip: {skip}. Must be non-negative")
            
            if format not in ['json', 'xml']:
                raise ValueError(f"Invalid format: {format}. Must be 'json' or 'xml'")
            
            return self._search_odata_endpoint('bills', {
                'title_keywords': title_keywords,
                'gazette_year': gazette_year,
                'gazette_start_date': gazette_start_date,
                'gazette_end_date': gazette_end_date,
                'top': top,
                'skip': skip,
                'format': format
            })
        
        @self.mcp.tool()
        def search_questions(
            question_type: str = "oral",
            subject_keywords: Optional[str] = None,
            member_name: Optional[str] = None,
            meeting_date: Optional[str] = None,
            year: Optional[int] = None,
            top: int = 100,
            skip: int = 0,
            format: str = "json"
        ) -> Dict[str, Any]:
            """Search questions at Council meetings.
            
            Args:
                question_type: Type of question ('oral' or 'written')
                subject_keywords: Keywords to search in question subjects
                member_name: Name of member who asked the question
                meeting_date: Meeting date in YYYY-MM-DD format
                year: Year of the meeting
                top: Number of records to return (default 100)
                skip: Number of records to skip (default 0)
                format: Return format ('json' or 'xml')
            
            Returns:
                Dictionary containing question information
            """
            # Validate inputs
            if not self._validate_enum(question_type, ['oral', 'written']):
                raise ValueError(f"Invalid question_type: {question_type}. Must be 'oral' or 'written'")
            
            if meeting_date and not self._validate_date_format(meeting_date):
                raise ValueError(f"Invalid meeting_date format: {meeting_date}. Use YYYY-MM-DD")
            
            if year and (not isinstance(year, int) or year < 2000 or year > 2100):
                raise ValueError(f"Invalid year: {year}. Must be between 2000 and 2100")
            
            if top < 1 or top > 1000:
                raise ValueError(f"Invalid top: {top}. Must be between 1 and 1000")
            
            if skip < 0:
                raise ValueError(f"Invalid skip: {skip}. Must be non-negative")
            
            if format not in ['json', 'xml']:
                raise ValueError(f"Invalid format: {format}. Must be 'json' or 'xml'")
            
            endpoint = 'questions_oral' if question_type == 'oral' else 'questions_written'
            return self._search_odata_endpoint(endpoint, {
                'subject_keywords': subject_keywords,
                'member_name': member_name,
                'meeting_date': meeting_date,
                'year': year,
                'top': top,
                'skip': skip,
                'format': format
            })
        
        @self.mcp.tool()
        def search_hansard(
            hansard_type: str = "hansard",
            subject_keywords: Optional[str] = None,
            speaker: Optional[str] = None,
            meeting_date: Optional[str] = None,
            year: Optional[int] = None,
            question_type: Optional[str] = None,
            top: int = 100,
            skip: int = 0,
            format: str = "json"
        ) -> Dict[str, Any]:
            """Search Hansard (official records of proceedings).
            
            Args:
                hansard_type: Type of Hansard record ('hansard', 'questions', 'bills', 'motions', 'voting')
                subject_keywords: Keywords to search in subjects
                speaker: Name of speaker
                meeting_date: Meeting date in YYYY-MM-DD format
                year: Year of the meeting
                question_type: For questions: 'Oral', 'Written', 'Urgent'
                top: Number of records to return (default 100)
                skip: Number of records to skip (default 0)
                format: Return format ('json' or 'xml')
            
            Returns:
                Dictionary containing Hansard records
            """
            # Validate inputs
            if not self._validate_enum(hansard_type, ['hansard', 'questions', 'bills', 'motions', 'voting']):
                raise ValueError(f"Invalid hansard_type: {hansard_type}. Must be one of: hansard, questions, bills, motions, voting")
            
            if meeting_date and not self._validate_date_format(meeting_date):
                raise ValueError(f"Invalid meeting_date format: {meeting_date}. Use YYYY-MM-DD")
            
            if year and (not isinstance(year, int) or year < 2000 or year > 2100):
                raise ValueError(f"Invalid year: {year}. Must be between 2000 and 2100")
            
            if question_type and not self._validate_enum(question_type, ['Oral', 'Written', 'Urgent']):
                raise ValueError(f"Invalid question_type: {question_type}. Must be 'Oral', 'Written', or 'Urgent'")
            
            if top < 1 or top > 1000:
                raise ValueError(f"Invalid top: {top}. Must be between 1 and 1000")
            
            if skip < 0:
                raise ValueError(f"Invalid skip: {skip}. Must be non-negative")
            
            if format not in ['json', 'xml']:
                raise ValueError(f"Invalid format: {format}. Must be 'json' or 'xml'")
            
            endpoint_map = {
                'hansard': 'hansard',
                'questions': 'hansard_questions',
                'bills': 'hansard_bills', 
                'motions': 'hansard_motions',
                'voting': 'hansard_voting'
            }
            
            endpoint = endpoint_map.get(hansard_type, 'hansard')
            return self._search_odata_endpoint(endpoint, {
                'subject_keywords': subject_keywords,
                'speaker': speaker,
                'meeting_date': meeting_date,
                'year': year,
                'question_type': question_type,
                'top': top,
                'skip': skip,
                'format': format
            })
        
        @self.mcp.tool()
        def search_meeting_summaries(
            year: Optional[int] = None,
            date: Optional[str] = None
        ) -> Dict[str, Any]:
            """Scrape LegCo meeting summaries (dates, agendas, links) from the official website.

            Args:
                year: Optional year to filter meetings (e.g., 2024)
                date: Optional date to filter meetings (YYYY-MM-DD)
            Returns:
                List of meetings with date, agenda, and links to records
            """
            # Validate inputs
            if year and (not isinstance(year, int) or year < 2000 or year > 2100):
                raise ValueError(f"Invalid year: {year}. Must be between 2000 and 2100")
            if date and not self._validate_date_format(date):
                raise ValueError(f"Invalid date format: {date}. Use YYYY-MM-DD")

            url = "https://www.legco.gov.hk/tc/legco-business/council/council-meetings.html"
            resp = self.client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            meetings = []
            # The actual HTML structure may change; this is a best guess based on typical LegCo pages
            for row in soup.select("table tr"):
                cells = row.find_all("td")
                if len(cells) < 2:
                    continue
                date_text = cells[0].get_text(strip=True)
                agenda = cells[1].get_text(strip=True)
                links = []
                for a in row.find_all("a", href=True):
                    links.append({
                        "text": a.get_text(strip=True),
                        "url": a["href"] if a["href"].startswith("http") else f"https://www.legco.gov.hk{a['href']}"
                    })
                # Filter by year or date if provided
                if year or date:
                    try:
                        # Try to parse date_text to YYYY-MM-DD
                        parsed_date = None
                        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y"):
                            try:
                                parsed_date = datetime.strptime(date_text, fmt)
                                break
                            except Exception:
                                continue
                        if not parsed_date:
                            continue
                        if year and parsed_date.year != year:
                            continue
                        if date and parsed_date.strftime("%Y-%m-%d") != date:
                            continue
                    except Exception:
                        continue
                meetings.append({
                    "date": date_text,
                    "agenda": agenda,
                    "links": links
                })
            return {"meetings": meetings}
    
    def _search_odata_endpoint(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search an OData endpoint with filters."""
        url = self.BASE_URLS.get(endpoint)
        if not url:
            raise LegCoAPIError(f"Unknown endpoint: {endpoint}")
        
        # Build OData query parameters
        query_params = {}
        filters = []
        
        # Add format parameter
        if params.get('format') == 'xml':
            query_params['$format'] = 'xml'
        
        # Add top and skip parameters
        if params.get('top') is not None:
            query_params['$top'] = str(params['top'])
        if params.get('skip') is not None:
            query_params['$skip'] = str(params['skip'])
        
        # Add inline count
        query_params['$inlinecount'] = 'allpages'
        
        # Build filters based on endpoint
        if endpoint == 'voting':
            if params.get('meeting_type'):
                safe_type = self._sanitize_string(params['meeting_type'])
                filters.append(f"type eq '{safe_type}'")
            if params.get('start_date'):
                filters.append(f"start_date ge datetime'{params['start_date']}'")
            if params.get('end_date'):
                filters.append(f"start_date le datetime'{params['end_date']}'")
            if params.get('member_name'):
                safe_name = self._sanitize_string(params['member_name'])
                filters.append(f"substringof('{safe_name}', name_en)")
            if params.get('motion_keywords'):
                safe_keywords = self._sanitize_string(params['motion_keywords'])
                filters.append(f"substringof('{safe_keywords}', motion_en)")
            if params.get('term_no'):
                filters.append(f"term_no eq {params['term_no']}")
                
        elif endpoint == 'bills':
            if params.get('title_keywords'):
                safe_keywords = self._sanitize_string(params['title_keywords'])
                filters.append(f"substringof('{safe_keywords}', bill_title_eng)")
            if params.get('gazette_year'):
                filters.append(f"year(bill_gazette_date) eq {params['gazette_year']}")
            if params.get('gazette_start_date'):
                filters.append(f"bill_gazette_date ge datetime'{params['gazette_start_date']}'")
            if params.get('gazette_end_date'):
                filters.append(f"bill_gazette_date le datetime'{params['gazette_end_date']}'")
                
        elif endpoint in ['questions_oral', 'questions_written']:
            if params.get('subject_keywords'):
                safe_keywords = self._sanitize_string(params['subject_keywords'])
                filters.append(f"substringof('{safe_keywords}', SubjectName)")
            if params.get('member_name'):
                safe_name = self._sanitize_string(params['member_name'])
                filters.append(f"substringof('{safe_name}', MemberName)")
            if params.get('meeting_date'):
                filters.append(f"MeetingDate eq datetime'{params['meeting_date']}'")
            if params.get('year'):
                filters.append(f"year(MeetingDate) eq {params['year']}")
                
        elif endpoint.startswith('hansard'):
            if params.get('subject_keywords'):
                safe_keywords = self._sanitize_string(params['subject_keywords'])
                filters.append(f"substringof('{safe_keywords}', Subject)")
            if params.get('speaker'):
                safe_speaker = self._sanitize_string(params['speaker'])
                filters.append(f"Speaker eq '{safe_speaker}'")
            if params.get('meeting_date'):
                filters.append(f"MeetingDate eq datetime'{params['meeting_date']}'")
            if params.get('year'):
                filters.append(f"year(MeetingDate) eq {params['year']}")
            if params.get('question_type') and endpoint == 'hansard_questions':
                safe_qtype = self._sanitize_string(params['question_type'])
                filters.append(f"QuestionType eq '{safe_qtype}'")
                filters.append("HansardType eq 'English'")
        
        # Add filters to query
        if filters:
            query_params['$filter'] = ' and '.join(filters)
        
        try:
            # Make the API request with additional headers for better compatibility
            headers = {
                'User-Agent': 'LegCo-Search-MCP/1.0',
                'Accept': 'application/json' if params.get('format') != 'xml' else 'application/xml'
            }
            response = self.client.get(url, params=query_params, headers=headers)
            response.raise_for_status()
            
            if params.get('format') == 'xml':
                return {
                    'data': response.text,
                    'format': 'xml',
                    'content_type': response.headers.get('content-type', 'application/xml'),
                    'total_records': self._extract_xml_count(response.text) if '$inlinecount=allpages' in str(query_params) else None
                }
            else:
                json_data = response.json()
                # Add metadata about the response
                if isinstance(json_data, dict):
                    json_data['_metadata'] = {
                        'endpoint': endpoint,
                        'query_params': {k: v for k, v in query_params.items() if not k.startswith('$')},
                        'total_available': json_data.get('d', {}).get('__count') if 'd' in json_data else None
                    }
                return json_data
                
        except httpx.HTTPStatusError as e:
            error_text = ""
            try:
                if hasattr(e, 'response') and e.response:
                    error_text = e.response.text[:200] if hasattr(e.response, 'text') else 'Unknown error'
                    status_code = getattr(e.response, 'status_code', 'Unknown')
                else:
                    status_code = 'Unknown'
                    error_text = 'No response details'
            except Exception:
                status_code = 'Unknown'
                error_text = 'Error accessing response details'
            raise LegCoAPIError(f"HTTP error {status_code}: {error_text}")
        except httpx.RequestError as e:
            raise LegCoAPIError(f"Request error: {str(e)[:200]}")
        except json.JSONDecodeError as e:
            raise LegCoAPIError(f"Invalid JSON response from API: {str(e)[:100]}")
        except Exception as e:
            raise LegCoAPIError(f"Unexpected error: {str(e)[:200]}")
    
    def run(self):
        """Run the MCP server."""
        self.mcp.run()


def main():
    """Main entry point."""
    with LegCoSearchMCP() as server:
        server.run()


if __name__ == "__main__":
    main()