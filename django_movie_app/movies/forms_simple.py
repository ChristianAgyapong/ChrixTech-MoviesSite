from django import forms
from .models import UserPreferences

class UserPreferencesForm(forms.ModelForm):
    class Meta:
        model = UserPreferences
        exclude = ['user', 'created_at', 'updated_at']
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Add CSS classes to all form fields
        for field_name, field in self.fields.items():
            field.widget.attrs.update({'class': 'form-control'})
            
        # Customize genre selection
        self.fields['preferred_genres'].widget = forms.CheckboxSelectMultiple(
            choices=[
                ('Action', 'Action'),
                ('Adventure', 'Adventure'),
                ('Animation', 'Animation'),
                ('Comedy', 'Comedy'),
                ('Crime', 'Crime'),
                ('Documentary', 'Documentary'),
                ('Drama', 'Drama'),
                ('Family', 'Family'),
                ('Fantasy', 'Fantasy'),
                ('Horror', 'Horror'),
                ('Romance', 'Romance'),
                ('Science Fiction', 'Science Fiction'),
                ('Thriller', 'Thriller'),
            ]
        )
        
        # Customize rating field
        self.fields['min_rating'].widget = forms.NumberInput(
            attrs={'min': 0, 'max': 10, 'step': 0.1, 'class': 'form-control'}
        )
        
        # Style checkboxes
        for field_name in ['auto_add_to_history', 'email_notifications']:
            self.fields[field_name].widget.attrs.update({'class': 'form-check-input'})
            
    def clean_preferred_genres(self):
        """Ensure preferred_genres is always a list"""
        genres = self.cleaned_data.get('preferred_genres')
        if genres is None:
            return []
        return genres if isinstance(genres, list) else list(genres)
