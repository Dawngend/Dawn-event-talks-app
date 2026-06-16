import urllib.request
import xml.etree.ElementTree as ET
import json

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

try:
    print(f"Fetching {url}...")
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    print("Fetched successfully. Parsing XML...")
    root = ET.fromstring(xml_data)
    
    # Extract namespaces
    # Atom feeds typically use http://www.w3.org/2005/Atom namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    feed_title = root.find('atom:title', ns)
    print("Feed Title:", feed_title.text if feed_title is not None else "Unknown")
    
    entries = []
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        updated = entry.find('atom:updated', ns)
        content = entry.find('atom:content', ns)
        link = entry.find('atom:link', ns)
        
        entry_data = {
            'title': title.text if title is not None else '',
            'updated': updated.text if updated is not None else '',
            'content': content.text if content is not None else '',
            'link': link.attrib.get('href', '') if link is not None else ''
        }
        entries.append(entry_data)
        
    print(f"Found {len(entries)} entries.")
    if entries:
        print("First entry sample:")
        print(json.dumps(entries[0], indent=2))
        
except Exception as e:
    print("Error:", e)
