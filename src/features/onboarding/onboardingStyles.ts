import { StyleSheet } from 'react-native';

export const onboardingStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: {
    borderColor: '#208AEF',
    backgroundColor: '#E6F4FE',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#208AEF',
    fontWeight: '600',
  },
  option: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: '#208AEF',
    backgroundColor: '#E6F4FE',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  error: {
    color: '#D32F2F',
    fontSize: 13,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#208AEF',
    padding: 14,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#A8CCEF',
  },
  buttonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#208AEF',
    padding: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#208AEF',
    textAlign: 'center',
    fontWeight: '600',
  },
});
