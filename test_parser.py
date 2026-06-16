import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import json

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

try:
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    parsed_updates = []
    
    for entry in root.findall('atom:entry', ns):
        date_str = entry.find('atom:title', ns).text
        updated_time = entry.find('atom:updated', ns).text
        link_el = entry.find('atom:link', ns)
        link = link_el.attrib.get('href', '') if link_el is not None else ''
        content_html = entry.find('atom:content', ns).text
        
        if not content_html:
            continue
            
        soup = BeautifulSoup(content_html, 'html.parser')
        
        # We can find all h3 elements, and group siblings until the next h3
        current_type = "General"
        current_elements = []
        
        for child in soup.contents:
            if child.name == 'h3':
                # Save previous update if exists
                if current_elements:
                    desc_html = "".join([str(el) for el in current_elements]).strip()
                    desc_text = BeautifulSoup(desc_html, 'html.parser').get_text(separator=" ").strip()
                    parsed_updates.append({
                        'date': date_str,
                        'updated_time': updated_time,
                        'link': link,
                        'type': current_type,
                        'description_html': desc_html,
                        'description_text': desc_text
                    })
                current_type = child.get_text().strip()
                current_elements = []
            elif child.name is not None:
                current_elements.append(child)
                
        # Append the last one
        if current_elements or current_type != "General":
            desc_html = "".join([str(el) for el in current_elements]).strip()
            desc_text = BeautifulSoup(desc_html, 'html.parser').get_text(separator=" ").strip()
            parsed_updates.append({
                'date': date_str,
                'updated_time': updated_time,
                'link': link,
                'type': current_type,
                'description_html': desc_html,
                'description_text': desc_text
            })
            
    print(f"Parsed {len(parsed_updates)} individual sub-updates.")
    print("Sample of top 3 updates:")
    print(json.dumps(parsed_updates[:3], indent=2))
        
except Exception as e:
    print("Error:", e)
