# Check if commit message was provided
if [ -z "$1" ]; then
  echo "❌ Please provide a commit message"
  echo "Usage: ./gitpush \"your message\""
  exit 1
fi

# Get current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "📦 Adding changes..."
git add .

echo "📝 Committing with message: $1"
git commit -m "$1"

echo "⬇️ Pulling latest changes from $BRANCH..."
git pull origin $BRANCH --rebase

echo "🚀 Pushing to $BRANCH..."
git push origin $BRANCH

echo "✅ Done!"