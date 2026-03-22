with open('firestore.rules', 'r') as f:
    content = f.read()

search_pattern = """      allow delete: if isAuthenticated() && (request.auth.uid == resource.data.creatorId || isAdmin());"""

replacement = """      allow delete: if isAuthenticated() && (request.auth.uid == resource.data.creatorId || isAdmin());

      match /messages/{messageId} {
        allow read, write: if isAuthenticated();
      }"""

new_content = content.replace(search_pattern, replacement)

with open('firestore.rules', 'w') as f:
    f.write(new_content)
