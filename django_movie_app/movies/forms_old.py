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
            
        # Customize specific fields
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
                ('History', 'History'),
                ('Horror', 'Horror'),
                ('Music', 'Music'),
                ('Mystery', 'Mystery'),
                ('Romance', 'Romance'),
                ('Science Fiction', 'Science Fiction'),
                ('Thriller', 'Thriller'),
                ('War', 'War'),
                ('Western', 'Western'),
            ]
        )
        
        self.fields['min_rating'].widget = forms.NumberInput(
            attrs={'min': 0, 'max': 10, 'step': 0.1, 'class': 'form-control'}
        )
        self.fields['max_rating'].widget = forms.NumberInput(
            attrs={'min': 0, 'max': 10, 'step': 0.1, 'class': 'form-control'}
        )
        self.fields['min_release_year'].widget = forms.NumberInput(
            attrs={'min': 1900, 'max': 2030, 'class': 'form-control'}
        )
        self.fields['max_release_year'].widget = forms.NumberInput(
            attrs={'min': 1900, 'max': 2030, 'class': 'form-control'}
        )
        
        # Style checkboxes and radio buttons
        for field_name in ['public_watch_history', 'public_favorites', 'public_profile', 
                          'email_notifications', 'new_releases_notifications', 
                          'recommendation_notifications', 'weekly_summary', 
                          'auto_add_to_history', 'show_adult_content', 'data_saver_mode']:
            self.fields[field_name].widget.attrs.update({'class': 'form-check-input'})
    
    def clean_preferred_genres(self):
        """Ensure preferred_genres is always a list, even if empty"""
        data = self.cleaned_data.get('preferred_genres')
        if data is None:
            return []
        return data if isinstance(data, list) else list(data)
